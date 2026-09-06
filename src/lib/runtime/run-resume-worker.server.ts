import { getEntitlements } from "@/lib/platform/entitlements.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  failRun,
  RuntimeError,
  setRunState,
  type Agent,
  type PreparedRun,
} from "./runtime.server";
import { normaliseProvider, resolveModel } from "./model-gateway.server";
import { resolveGrantedTools } from "./tools.server";
import { executePlannedRun } from "./planner-runtime.server";
import { invalidateDurableRunCheckpoint, parseDurableRunCheckpoint } from "./run-checkpoint.server";
import {
  claimResumableRun,
  releaseRunResumeLease,
  type ClaimedRunResume,
} from "./run-resume.server";
import { isBlackstarAstraServingIdentity } from "./blackstar-astra-engine-profile";
import { selectBlackstarAstraReasoningControl } from "./blackstar-astra-reasoning";
import { buildRuntimeIntelligenceControl } from "./general-intelligence-runtime";

type Sb = { from: (table: string) => any; rpc?: (fn: string, args?: Record<string, unknown>) => any };

const STALE_AFTER_MS = 2 * 60_000;
const MAX_RESUME_ATTEMPTS = 3;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Durable resume failed unexpectedly.";
}

function resumedObjective(run: PreparedRun): string {
  for (let index = run.messages.length - 1; index >= 0; index -= 1) {
    const message = run.messages[index];
    if (message?.role === "user" && message.content.trim()) return message.content.trim().slice(0, 12_000);
  }
  return "";
}

/**
 * Rebuilds only Astra's bounded compute policy after a durable process resume.
 * Provider/model provenance was persisted before the interruption, so exact
 * serving identity is required and no re-routing or authority mutation occurs.
 */
export function reasoningControlForResumedAstraRun(run: PreparedRun) {
  if (!isBlackstarAstraServingIdentity(run.provider, run.model)) return null;
  const objective = resumedObjective(run);
  if (!objective) return null;
  const intelligence = buildRuntimeIntelligenceControl({ agent: run.agent, input: objective });
  return selectBlackstarAstraReasoningControl(intelligence.assessment);
}

export function shouldRetryResumedRun(args: {
  resumeCount: number;
  error: unknown;
  checkpoint: unknown;
}): boolean {
  if (args.error instanceof RuntimeError && args.error.code === "CANCELLED") return false;
  if (args.resumeCount >= MAX_RESUME_ATTEMPTS) return false;
  return parseDurableRunCheckpoint(args.checkpoint) !== null;
}

async function prepareClaimedRun(sb: Sb, claim: ClaimedRunResume): Promise<PreparedRun> {
  const { data: agentRow, error: agentError } = await sb
    .from("personal_agents")
    .select("*")
    .eq("id", claim.agentId)
    .maybeSingle();
  if (agentError || !agentRow) throw new RuntimeError("Could not reload the agent for resume.", "AGENT_LOAD_FAILED", 500);

  const agent = agentRow as Agent;
  if (agent.status === "archived") {
    throw new RuntimeError("The agent was archived while the run was interrupted.", "AGENT_ARCHIVED", 409);
  }
  const orgId = agent.org_id_fk ?? agent.org_id ?? claim.orgId ?? null;
  const entitlements = await getEntitlements(sb as never, claim.userId, orgId);
  const tools = await resolveGrantedTools(sb, agent, entitlements.planCode);
  const provider = normaliseProvider(claim.provider ?? agent.model_provider);
  const model = claim.model ?? resolveModel(provider, agent.model);

  return {
    agent,
    orgId,
    taskId: claim.taskId,
    messages: claim.checkpoint.messages.map((message) => ({ ...message })),
    tools,
    provider,
    model,
    startedAt: Date.now(),
  };
}

async function currentCheckpoint(sb: Sb, taskId: string): Promise<unknown> {
  const { data } = await sb
    .from("agent_tasks")
    .select("checkpoint_state")
    .eq("id", taskId)
    .maybeSingle();
  return data?.checkpoint_state ?? null;
}

export async function resumeOneStaleAgentRun(args: {
  sb?: Sb;
  now?: Date;
} = {}): Promise<"none" | "resumed" | "retryable_failure" | "failed"> {
  const sb = args.sb ?? (supabaseAdmin as unknown as Sb);
  const now = args.now ?? new Date();
  const claim = await claimResumableRun({
    sb,
    staleBefore: new Date(now.getTime() - STALE_AFTER_MS),
    leaseSeconds: 180,
  });
  if (!claim) return "none";

  let run: PreparedRun | null = null;
  try {
    run = await prepareClaimedRun(sb, claim);
    const reasoningControl = reasoningControlForResumedAstraRun(run);
    await setRunState(sb, claim.taskId, "running");
    await executePlannedRun({
      sb,
      userId: claim.userId,
      run,
      resumeCheckpoint: claim.checkpoint,
      reasoningControl,
    });
    await invalidateDurableRunCheckpoint({ sb, taskId: claim.taskId });
    await releaseRunResumeLease({ sb, taskId: claim.taskId, leaseToken: claim.leaseToken });
    return "resumed";
  } catch (error) {
    const checkpoint = await currentCheckpoint(sb, claim.taskId).catch(() => null);
    const retryable = shouldRetryResumedRun({
      resumeCount: claim.resumeCount,
      error,
      checkpoint,
    });
    if (retryable) {
      await releaseRunResumeLease({
        sb,
        taskId: claim.taskId,
        leaseToken: claim.leaseToken,
        error: errorText(error),
      }).catch(() => false);
      return "retryable_failure";
    }

    if (run) {
      await failRun({ userId: claim.userId, run, error });
    } else {
      await sb
        .from("agent_tasks")
        .update({
          status: error instanceof RuntimeError && error.code === "CANCELLED" ? "cancelled" : "failed",
          error: errorText(error).slice(0, 1000),
          completed_at: new Date().toISOString(),
          heartbeat_at: new Date().toISOString(),
        })
        .eq("id", claim.taskId);
    }
    await releaseRunResumeLease({
      sb,
      taskId: claim.taskId,
      leaseToken: claim.leaseToken,
      error: errorText(error),
    }).catch(() => false);
    return "failed";
  }
}

export async function processResumableAgentRuns(limit = 2) {
  const bounded = Math.max(1, Math.min(4, Math.floor(limit)));
  const stats = { resumed: 0, retryable_failed: 0, failed: 0 };
  for (let index = 0; index < bounded; index += 1) {
    const result = await resumeOneStaleAgentRun();
    if (result === "none") break;
    if (result === "resumed") stats.resumed += 1;
    else if (result === "retryable_failure") stats.retryable_failed += 1;
    else stats.failed += 1;
  }
  return stats;
}
