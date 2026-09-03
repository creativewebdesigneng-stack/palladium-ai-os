import { assertWithinLimit, getEntitlements } from "@/lib/platform/entitlements.server";
import { assertSupportedWorkflowStepKind } from "./workflow-step-config";
import { executeWorkflowRun, WorkforceError, type StepOutcome } from "./workforce.server";

type Sb = { from: (t: string) => any };

type WorkflowRow = {
  id: string;
  name: string;
  org_id: string | null;
  user_id: string;
  workforce_id: string | null;
  status: string;
};

type StepRow = {
  id: string;
  workflow_id: string;
  position: number;
  name: string | null;
  kind: string;
  agent_id: string | null;
  mode: string;
  depends_on: string[] | null;
  condition: Record<string, any> | null;
  input_template: string | null;
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  continue_on_error: boolean;
  requires_approval: boolean;
  config: Record<string, unknown> | null;
};

const MAX_STEPS = 25;
const MAX_BATCH = 4;
const MAX_OBJECTIVE_CHARS = 12_000;
const STALE_AFTER_MS = 15 * 60 * 1000;
const HEARTBEAT_MS = 30_000;

async function admin(): Promise<Sb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

export async function queueWorkflowRun(args: {
  sb: Sb;
  userId: string;
  workflowId: string;
  input: string;
  trigger?: string;
}) {
  const objective = String(args.input ?? "").trim();
  if (!objective) throw new WorkforceError("Give the workforce an objective.", "EMPTY_INPUT");
  if (objective.length > MAX_OBJECTIVE_CHARS)
    throw new WorkforceError(
      `Keep the workflow objective under ${MAX_OBJECTIVE_CHARS.toLocaleString()} characters.`,
      "INPUT_TOO_LONG",
    );

  const { data: workflow, error: workflowError } = await args.sb
    .from("workflows")
    .select("id,name,org_id,user_id,workforce_id,status")
    .eq("id", args.workflowId)
    .maybeSingle();
  if (workflowError || !workflow || workflow.user_id !== args.userId)
    throw new WorkforceError("Workflow not found or you do not have access to it.", "NOT_FOUND");
  if (workflow.status !== "active")
    throw new WorkforceError("Activate this workflow before running it.", "WORKFLOW_INACTIVE");

  const { data: rawSteps, error: stepError } = await args.sb
    .from("workflow_steps")
    .select("id,kind,agent_id")
    .eq("workflow_id", workflow.id)
    .order("position", { ascending: true });
  if (stepError) throw new WorkforceError("Could not load workflow steps.", "STEP_LOAD_FAILED");
  const steps = (rawSteps ?? []).slice(0, MAX_STEPS);
  if (!steps.length) throw new WorkforceError("This workflow has no steps yet.", "NO_STEPS");
  for (const [index, step] of steps.entries())
    assertSupportedWorkflowStepKind(step.kind, `Step ${index + 1}`);

  const orgId = (workflow.org_id as string | null) ?? null;
  const ent = await getEntitlements(args.sb as never, args.userId, orgId);
  assertWithinLimit(ent, "tasks_per_month");

  const now = new Date().toISOString();
  const { data: run, error } = await args.sb
    .from("workflow_runs")
    .insert({
      workflow_id: workflow.id,
      workforce_id: workflow.workforce_id ?? null,
      org_id: orgId,
      user_id: args.userId,
      status: "queued",
      trigger: args.trigger ?? "manual",
      input: objective,
      queued_at: now,
      worker_attempts: 0,
      worker_error: null,
      cancel_requested: false,
    })
    .select("id,status,queued_at")
    .maybeSingle();
  if (error || !run?.id)
    throw new WorkforceError(error?.message ?? "Could not queue that workforce run.", "RUN_CREATE_FAILED");

  return { run };
}

async function validateWorkerScope(db: Sb, run: any, workflow: WorkflowRow, steps: StepRow[]) {
  if (workflow.user_id !== run.user_id || (workflow.org_id ?? null) !== (run.org_id ?? null))
    throw new WorkforceError("Queued workflow ownership no longer matches its workflow.", "QUEUE_SCOPE_MISMATCH");

  const ids = [...new Set(steps.map((step) => step.agent_id).filter(Boolean))] as string[];
  if (!ids.length) return;
  const { data, error } = await db
    .from("personal_agents")
    .select("id,user_id,org_id,org_id_fk,status")
    .in("id", ids);
  if (error) throw new WorkforceError("Could not validate workflow agents.", "AGENT_SCOPE_FAILED");
  const byId = new Map((data ?? []).map((row: any) => [String(row.id), row]));
  for (const id of ids) {
    const agent: any = byId.get(id);
    const sameOwner = agent?.user_id === run.user_id;
    const sameOrg = Boolean(
      run.org_id && (agent?.org_id === run.org_id || agent?.org_id_fk === run.org_id),
    );
    if (!agent || (!sameOwner && !sameOrg) || agent.status === "archived")
      throw new WorkforceError("A queued workflow references an agent outside its allowed scope.", "AGENT_SCOPE_MISMATCH");
  }
}

async function executeClaimedRun(db: Sb, claimed: any) {
  const { data: workflow } = await db
    .from("workflows")
    .select("id,name,org_id,user_id,workforce_id,status")
    .eq("id", claimed.workflow_id)
    .maybeSingle();
  if (!workflow || workflow.status !== "active")
    throw new WorkforceError("Queued workflow is missing or inactive.", "WORKFLOW_UNAVAILABLE");

  const { data: rawSteps } = await db
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflow.id)
    .order("position", { ascending: true });
  const steps = ((rawSteps ?? []) as StepRow[]).slice(0, MAX_STEPS);
  if (!steps.length) throw new WorkforceError("Queued workflow has no executable steps.", "NO_STEPS");
  for (const [index, step] of steps.entries())
    assertSupportedWorkflowStepKind(step.kind, `Step ${index + 1}`);
  await validateWorkerScope(db, claimed, workflow as WorkflowRow, steps);

  const heartbeat = setInterval(() => {
    void db
      .from("workflow_runs")
      .update({ worker_heartbeat_at: new Date().toISOString() })
      .eq("id", claimed.id)
      .eq("status", "running");
  }, HEARTBEAT_MS);

  try {
    const completed = Array.isArray(claimed.step_results)
      ? (claimed.step_results as StepOutcome[])
      : [];
    return await executeWorkflowRun({
      sb: db,
      db,
      userId: claimed.user_id,
      workflow: workflow as WorkflowRow,
      steps,
      runId: claimed.id,
      objective: String(claimed.input ?? ""),
      completed,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function failClaimedRun(db: Sb, claimed: any, error: unknown) {
  const message = error instanceof Error ? error.message : "Workflow worker failed.";
  const attempts = Math.max(1, Number(claimed.worker_attempts ?? 1));
  if (attempts < 3) {
    await db
      .from("workflow_runs")
      .update({
        status: "queued",
        queued_at: new Date(Date.now() + attempts * 5_000).toISOString(),
        worker_claimed_at: null,
        worker_heartbeat_at: null,
        worker_error: message.slice(0, 1000),
      })
      .eq("id", claimed.id)
      .eq("status", "running");
    return "requeued";
  }
  await db
    .from("workflow_runs")
    .update({
      status: "failed",
      worker_error: message.slice(0, 1000),
      error: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", claimed.id)
    .eq("status", "running");
  return "failed";
}

async function requeueStaleRuns(db: Sb) {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data } = await db
    .from("workflow_runs")
    .select("id,worker_attempts")
    .eq("status", "running")
    .lt("worker_heartbeat_at", cutoff)
    .limit(MAX_BATCH * 2);
  let requeued = 0;
  for (const run of data ?? []) {
    const attempts = Number(run.worker_attempts ?? 0);
    await db
      .from("workflow_runs")
      .update({
        status: attempts >= 3 ? "failed" : "queued",
        queued_at: attempts >= 3 ? null : new Date().toISOString(),
        worker_claimed_at: null,
        worker_heartbeat_at: null,
        worker_error: "Worker heartbeat expired before completion.",
        ...(attempts >= 3
          ? { error: "Worker heartbeat expired before completion.", completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", run.id)
      .eq("status", "running");
    requeued += 1;
  }
  return requeued;
}

export async function processQueuedWorkflowRuns(limit = 2) {
  const db = await admin();
  const batch = Math.min(Math.max(Number(limit) || 1, 1), MAX_BATCH);
  const staleRequeued = await requeueStaleRuns(db);
  const now = new Date().toISOString();
  const { data: candidates, error } = await db
    .from("workflow_runs")
    .select("*")
    .eq("status", "queued")
    .lte("queued_at", now)
    .order("queued_at", { ascending: true })
    .limit(batch * 3);
  if (error) throw new WorkforceError(error.message, "QUEUE_LOAD_FAILED");

  let claimed = 0;
  let succeeded = 0;
  let failed = 0;
  let requeued = 0;
  for (const candidate of candidates ?? []) {
    if (claimed >= batch) break;
    const { data: run } = await db
      .from("workflow_runs")
      .update({
        status: "running",
        worker_claimed_at: now,
        worker_heartbeat_at: now,
        worker_attempts: Number(candidate.worker_attempts ?? 0) + 1,
        worker_error: null,
        started_at: candidate.started_at ?? now,
      })
      .eq("id", candidate.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();
    if (!run) continue;
    claimed += 1;
    try {
      const result = await executeClaimedRun(db, run);
      if (result?.run?.status === "succeeded") succeeded += 1;
      else if (result?.run?.status === "failed") failed += 1;
    } catch (error) {
      const outcome = await failClaimedRun(db, run, error);
      if (outcome === "requeued") requeued += 1;
      else failed += 1;
    }
  }

  return { claimed, succeeded, failed, requeued, stale_requeued: staleRequeued };
}
