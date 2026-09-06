import type { AgentPlan, VerificationDecision } from "@/lib/agents/agent-planner";
import type { ChatMessage } from "./model-gateway.server";

export type RunCheckpointPhase = "model_boundary" | "tool_boundary" | "verification_boundary";

export type DurableDecisionState = {
  version: 1;
  informational_only: true;
  current_step_id: string | null;
  steps: Array<{
    id: string;
    status: AgentPlan["steps"][number]["status"];
    evidence_count: number;
  }>;
  verification: {
    passed: boolean;
    score: number;
    issue_count: number;
    evidence_count: number;
    next_action: VerificationDecision["next_action"];
  } | null;
  next_action: "continue_plan" | "verify" | "complete" | "replan" | "escalate";
};

export type DurableRunCheckpoint = {
  schema: 1;
  phase: RunCheckpointPhase;
  safe_to_resume: true;
  saved_at: string;
  messages: ChatMessage[];
  plan: AgentPlan;
  tool_rounds: number;
  tool_call_count: number;
  usage: { input: number; output: number };
  /**
   * Safe persisted decision/progress state only. This deliberately excludes
   * hidden chain-of-thought, raw verifier prose, credentials, tool grants,
   * approval state, delegation state and any other execution authority.
   */
  decision_state?: DurableDecisionState;
};

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_DECISION_STEPS = 20;

function clampNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function clampScore(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

function compactMessage(message: ChatMessage): ChatMessage {
  const content = String(message.content ?? "").slice(0, MAX_MESSAGE_CHARS);
  return {
    ...message,
    content,
    ...(Array.isArray(message.tool_calls)
      ? {
          tool_calls: message.tool_calls.slice(0, 12).map((call) => ({
            ...call,
            arguments: call.arguments && typeof call.arguments === "object" ? call.arguments : {},
          })),
        }
      : {}),
  };
}

export function createDurableDecisionState(args: {
  plan: AgentPlan;
  verification?: VerificationDecision | null;
}): DurableDecisionState {
  const verification = args.verification
    ? {
        passed: args.verification.passed === true,
        score: clampScore(args.verification.score),
        issue_count: Math.min(clampNumber(args.verification.issues.length), 100),
        evidence_count: Math.min(clampNumber(args.verification.evidence.length), 100),
        next_action: args.verification.next_action,
      }
    : null;

  const next_action: DurableDecisionState["next_action"] = verification
    ? verification.next_action === "complete"
      ? "complete"
      : verification.next_action === "escalate"
        ? "escalate"
        : "replan"
    : args.plan.current_step_id
      ? "continue_plan"
      : "verify";

  return {
    version: 1,
    informational_only: true,
    current_step_id: args.plan.current_step_id,
    steps: args.plan.steps.slice(0, MAX_DECISION_STEPS).map((step) => ({
      id: step.id.slice(0, 80),
      status: step.status,
      evidence_count: Math.min(clampNumber(step.evidence.length), 100),
    })),
    verification,
    next_action,
  };
}

function parseDecisionState(value: unknown): DurableDecisionState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (row["version"] !== 1 || row["informational_only"] !== true || !Array.isArray(row["steps"])) {
    return undefined;
  }

  const statuses = new Set(["pending", "in_progress", "completed", "blocked", "skipped"]);
  const steps = row["steps"]
    .slice(0, MAX_DECISION_STEPS)
    .flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const step = value as Record<string, unknown>;
      const id = typeof step["id"] === "string" ? step["id"].slice(0, 80) : "";
      const status = String(step["status"] ?? "");
      if (!id || !statuses.has(status)) return [];
      return [{
        id,
        status: status as AgentPlan["steps"][number]["status"],
        evidence_count: Math.min(clampNumber(Number(step["evidence_count"])), 100),
      }];
    });

  const verificationRow = row["verification"] && typeof row["verification"] === "object" && !Array.isArray(row["verification"])
    ? (row["verification"] as Record<string, unknown>)
    : null;
  const verificationActions = new Set(["complete", "replan", "escalate"]);
  const verification = verificationRow && verificationActions.has(String(verificationRow["next_action"] ?? ""))
    ? {
        passed: verificationRow["passed"] === true,
        score: clampScore(Number(verificationRow["score"])),
        issue_count: Math.min(clampNumber(Number(verificationRow["issue_count"])), 100),
        evidence_count: Math.min(clampNumber(Number(verificationRow["evidence_count"])), 100),
        next_action: String(verificationRow["next_action"]) as VerificationDecision["next_action"],
      }
    : null;

  const allowedNext = new Set(["continue_plan", "verify", "complete", "replan", "escalate"]);
  const next = String(row["next_action"] ?? "");
  const next_action: DurableDecisionState["next_action"] = allowedNext.has(next)
    ? (next as DurableDecisionState["next_action"])
    : verification?.next_action === "complete"
      ? "complete"
      : verification?.next_action === "escalate"
        ? "escalate"
        : verification
          ? "replan"
          : "continue_plan";

  return {
    version: 1,
    informational_only: true,
    current_step_id: typeof row["current_step_id"] === "string" ? row["current_step_id"].slice(0, 80) : null,
    steps,
    verification,
    next_action,
  };
}

export function createDurableRunCheckpoint(args: {
  phase: RunCheckpointPhase;
  messages: ChatMessage[];
  plan: AgentPlan;
  toolRounds: number;
  toolCallCount: number;
  usage: { input: number; output: number };
  verification?: VerificationDecision | null;
  now?: Date;
}): DurableRunCheckpoint {
  return {
    schema: 1,
    phase: args.phase,
    safe_to_resume: true,
    saved_at: (args.now ?? new Date()).toISOString(),
    messages: args.messages.slice(-MAX_MESSAGES).map(compactMessage),
    plan: args.plan,
    tool_rounds: clampNumber(args.toolRounds),
    tool_call_count: clampNumber(args.toolCallCount),
    usage: {
      input: clampNumber(args.usage.input),
      output: clampNumber(args.usage.output),
    },
    decision_state: createDurableDecisionState({
      plan: args.plan,
      ...(args.verification !== undefined ? { verification: args.verification } : {}),
    }),
  };
}

export function parseDurableRunCheckpoint(value: unknown): DurableRunCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row["schema"] !== 1 || row["safe_to_resume"] !== true) return null;
  if (!["model_boundary", "tool_boundary", "verification_boundary"].includes(String(row["phase"]))) {
    return null;
  }
  if (!Array.isArray(row["messages"]) || !row["plan"] || typeof row["plan"] !== "object") return null;
  if (!row["usage"] || typeof row["usage"] !== "object") return null;

  const usage = row["usage"] as Record<string, unknown>;
  const input = Number(usage["input"]);
  const output = Number(usage["output"]);
  const toolRounds = Number(row["tool_rounds"]);
  const toolCallCount = Number(row["tool_call_count"]);
  if (![input, output, toolRounds, toolCallCount].every(Number.isFinite)) return null;

  const checkpoint = value as DurableRunCheckpoint;
  const { decision_state: _untrustedDecisionState, ...base } = checkpoint;
  const decisionState = parseDecisionState(row["decision_state"]);
  return decisionState ? { ...base, decision_state: decisionState } : base;
}

export async function persistDurableRunCheckpoint(args: {
  sb: { from: (table: string) => any };
  taskId: string;
  checkpoint: DurableRunCheckpoint;
}) {
  const { error } = await args.sb
    .from("agent_tasks")
    .update({
      checkpoint_state: args.checkpoint,
      checkpoint_version: args.checkpoint.schema,
      checkpointed_at: args.checkpoint.saved_at,
      heartbeat_at: args.checkpoint.saved_at,
    })
    .eq("id", args.taskId);
  if (error) throw error;
}

/**
 * Removes resumability immediately before external tool execution begins.
 * If the worker dies after this point, the stale run is intentionally not
 * auto-resumable because the side effect may have been dispatched already.
 */
export async function invalidateDurableRunCheckpoint(args: {
  sb: { from: (table: string) => any };
  taskId: string;
}) {
  const now = new Date().toISOString();
  const { error } = await args.sb
    .from("agent_tasks")
    .update({
      checkpoint_state: null,
      checkpoint_version: 0,
      checkpointed_at: null,
      heartbeat_at: now,
    })
    .eq("id", args.taskId);
  if (error) throw error;
}
