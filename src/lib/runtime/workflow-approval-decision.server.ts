import { notify } from "@/lib/notifications/notify.server";
import { executeWorkflowRun, WorkforceError, type StepOutcome } from "./workforce.server";

type Sb = { from: (table: string) => any };

type Decision = "approved" | "rejected";

type ApprovalDetails = {
  workflow_run_id: string;
  workflow_id: string;
  workflow_step_id: string;
  workflow_step_run_id: string;
};

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 && id.length <= 128 && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
}

function detailsOf(value: unknown): ApprovalDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const workflow_run_id = asId(row["workflow_run_id"]);
  const workflow_id = asId(row["workflow_id"]);
  const workflow_step_id = asId(row["workflow_step_id"]);
  const workflow_step_run_id = asId(row["workflow_step_run_id"]);
  if (!workflow_run_id || !workflow_id || !workflow_step_id || !workflow_step_run_id) return null;
  return { workflow_run_id, workflow_id, workflow_step_id, workflow_step_run_id };
}

async function admin(): Promise<Sb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Sb;
}

function approvalOutcome(args: {
  step: any;
  stepRunId: string;
  decision: Decision;
  note?: string | null;
}): StepOutcome {
  const approved = args.decision === "approved";
  return {
    step_id: String(args.step.id),
    step_run_id: args.stepRunId,
    name: String(args.step.name || `Step ${Number(args.step.position ?? 0) + 1}`),
    agent_id: null,
    status: approved ? "succeeded" : "failed",
    output: approved ? "Approved by the workflow owner." : "Rejected by the workflow owner.",
    error: approved ? null : (args.note?.trim().slice(0, 500) || "Approval was rejected."),
    attempts: 1,
    duration_ms: 0,
    tokens_in: 0,
    tokens_out: 0,
  };
}

/**
 * Decides a workflow approval and, when appropriate, resumes the same durable
 * workflow run. Organisation visibility never grants approval authority: the
 * approval request and run must both belong to the authenticated user.
 */
export async function decideWorkflowApproval(args: {
  sb: Sb;
  userId: string;
  approvalRequestId: string;
  decision: Decision;
  note?: string | null;
}) {
  const { data: approval, error: approvalReadError } = await args.sb
    .from("approval_requests")
    .select("id,user_id,org_id,status,details,title")
    .eq("id", args.approvalRequestId)
    .maybeSingle();
  if (approvalReadError) throw new WorkforceError(approvalReadError.message, "APPROVAL_READ_FAILED");
  if (!approval)
    throw new WorkforceError("Approval request not found or you do not have access to it.", "NOT_FOUND");
  if (approval.user_id !== args.userId)
    throw new WorkforceError("Only the workflow owner can decide this approval.", "FORBIDDEN");
  if (approval.status !== "pending")
    throw new WorkforceError("This approval request has already been decided.", "ALREADY_DECIDED");

  const details = detailsOf(approval.details);
  if (!details)
    throw new WorkforceError("This approval request is not linked to a resumable workflow.", "INVALID_LINK");

  const { data: run, error: runReadError } = await args.sb
    .from("workflow_runs")
    .select(
      "id,workflow_id,user_id,org_id,status,cancel_requested,waiting_approval_request_id,waiting_step_id,step_results,input,tokens_in,tokens_out",
    )
    .eq("id", details.workflow_run_id)
    .maybeSingle();
  if (runReadError) throw new WorkforceError(runReadError.message, "RUN_READ_FAILED");
  if (!run || run.user_id !== args.userId)
    throw new WorkforceError("Workflow run not found or you do not own it.", "FORBIDDEN");
  if (run.workflow_id !== details.workflow_id)
    throw new WorkforceError("Approval does not belong to this workflow run.", "INVALID_LINK");
  if (run.waiting_approval_request_id !== approval.id || run.waiting_step_id !== details.workflow_step_id)
    throw new WorkforceError("Approval link is stale or mismatched.", "STALE_APPROVAL");
  if (run.status !== "waiting_for_approval" || run.cancel_requested === true)
    throw new WorkforceError("This workflow is no longer waiting for approval.", "NOT_WAITING");

  const [{ data: workflow }, { data: rawSteps }, { data: waitingStep }] = await Promise.all([
    args.sb
      .from("workflows")
      .select("id,name,org_id,user_id,workforce_id,status")
      .eq("id", details.workflow_id)
      .maybeSingle(),
    args.sb
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", details.workflow_id)
      .order("position", { ascending: true }),
    args.sb
      .from("workflow_steps")
      .select("*")
      .eq("id", details.workflow_step_id)
      .eq("workflow_id", details.workflow_id)
      .maybeSingle(),
  ]);
  if (!workflow || workflow.user_id !== args.userId || !waitingStep)
    throw new WorkforceError("Workflow approval association is no longer valid.", "INVALID_LINK");
  if (waitingStep.kind !== "approval")
    throw new WorkforceError("The waiting workflow step is not an approval gate.", "INVALID_LINK");

  const db = await admin();
  const now = new Date().toISOString();
  const decisionNote = args.note?.trim().slice(0, 500) || null;

  const { data: decided, error: decideError } = await db
    .from("approval_requests")
    .update({
      status: args.decision,
      decided_at: now,
      decided_by: args.userId,
      decision_note: decisionNote,
    })
    .eq("id", approval.id)
    .eq("user_id", args.userId)
    .eq("status", "pending")
    .select("id,status")
    .maybeSingle();
  if (decideError) throw new WorkforceError(decideError.message, "DECISION_FAILED");
  if (!decided)
    throw new WorkforceError("This approval request has already been decided.", "ALREADY_DECIDED");

  const { data: claimed, error: claimError } = await db
    .from("workflow_runs")
    .update({ status: "running", waiting_approval_request_id: null, waiting_step_id: null })
    .eq("id", run.id)
    .eq("user_id", args.userId)
    .eq("status", "waiting_for_approval")
    .eq("waiting_approval_request_id", approval.id)
    .select("id")
    .maybeSingle();
  if (claimError) throw new WorkforceError(claimError.message, "RESUME_CLAIM_FAILED");
  if (!claimed)
    throw new WorkforceError("This workflow is no longer waiting for this approval.", "NOT_WAITING");

  const outcome = approvalOutcome({
    step: waitingStep,
    stepRunId: details.workflow_step_run_id,
    decision: args.decision,
    note: decisionNote,
  });

  await db
    .from("workflow_step_runs")
    .update({
      status: outcome.status,
      output: outcome.output,
      error: outcome.error,
      completed_at: now,
      duration_ms: 0,
      tokens_in: 0,
      tokens_out: 0,
    })
    .eq("id", details.workflow_step_run_id)
    .eq("workflow_run_id", run.id)
    .eq("step_id", waitingStep.id);

  const completed = Array.isArray(run.step_results) ? (run.step_results as StepOutcome[]) : [];
  const withDecision = [...completed.filter((item) => item.step_id !== waitingStep.id), outcome];
  await db.from("workflow_runs").update({ step_results: withDecision }).eq("id", run.id).eq("user_id", args.userId);

  if (args.decision === "rejected" && !waitingStep.continue_on_error) {
    const error = outcome.error ?? "Approval was rejected.";
    const { data: failedRun } = await db
      .from("workflow_runs")
      .update({ status: "failed", error, completed_at: now, step_results: withDecision })
      .eq("id", run.id)
      .eq("user_id", args.userId)
      .eq("status", "running")
      .select("*")
      .maybeSingle();
    await notify({
      userId: args.userId,
      orgId: run.org_id ?? null,
      type: "workflow.failed",
      title: `Workflow approval rejected: ${workflow.name}`,
      body: error,
      link: "/workflows",
      metadata: { workflow_id: workflow.id, run_id: run.id },
    });
    return { approval: decided, run: failedRun ?? { ...run, status: "failed", error } };
  }

  const result = await executeWorkflowRun({
    sb: args.sb,
    db,
    userId: args.userId,
    workflow,
    steps: rawSteps ?? [],
    runId: run.id,
    objective: typeof run.input === "string" ? run.input : JSON.stringify(run.input ?? ""),
    completed: withDecision,
  });
  return { approval: decided, run: result.run, paused: result.paused ?? false };
}
