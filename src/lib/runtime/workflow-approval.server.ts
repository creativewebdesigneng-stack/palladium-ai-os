import { notify } from "@/lib/notifications/notify.server";

type Sb = { from: (table: string) => any };

type ApprovalStep = {
  id: string;
  workflow_id: string;
  position: number;
  name: string | null;
  kind: string;
  config: Record<string, unknown> | null;
};

export type WorkflowApprovalPause = {
  kind: "paused_for_approval";
  approvalRequestId: string;
  stepRunId: string;
  stepId: string;
};

function boundedText(value: unknown, fallback: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

function riskLevel(value: unknown): "low" | "medium" | "high" {
  return value === "medium" || value === "high" ? value : "low";
}

function expiresAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) return null;
  const max = Date.now() + 30 * 24 * 60 * 60 * 1000;
  return new Date(Math.min(parsed.getTime(), max)).toISOString();
}

/**
 * Creates the durable approval gate for a workflow step.
 *
 * This helper deliberately stores association identifiers only. Workflow input,
 * agent output, credentials and tool payloads never enter approval metadata.
 * The caller is responsible for stopping execution after this returns.
 */
export async function pauseForWorkflowApproval(args: {
  db: Sb;
  userId: string;
  orgId: string | null;
  workflowId: string;
  workflowName: string;
  runId: string;
  step: ApprovalStep;
  completed: unknown[];
}): Promise<WorkflowApprovalPause> {
  const config = args.step.config ?? {};
  const title = boundedText(
    config["title"],
    `${args.step.name || "Workflow step"} needs approval`,
    200,
  );
  const summary = boundedText(
    config["summary"] ?? config["message"],
    `Approve this step to continue ${args.workflowName}.`,
    500,
  );

  const { data: stepRun, error: stepRunError } = await args.db
    .from("workflow_step_runs")
    .insert({
      run_id: args.runId,
      workflow_id: args.workflowId,
      step_id: args.step.id,
      agent_id: null,
      org_id: args.orgId,
      user_id: args.userId,
      name: args.step.name || `Step ${args.step.position + 1}`,
      kind: "approval",
      position: args.step.position,
      attempt: 1,
      status: "waiting_for_approval",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (stepRunError || !stepRun?.id)
    throw new Error(stepRunError?.message ?? "Could not create the approval step ledger.");

  const details = {
    workflow_run_id: args.runId,
    workflow_id: args.workflowId,
    workflow_step_id: args.step.id,
    workflow_step_run_id: stepRun.id,
  };
  const expiry = expiresAt(config["expires_at"]);
  const { data: approval, error: approvalError } = await args.db
    .from("approval_requests")
    .insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: null,
      task_id: null,
      action_type: "workflow_step",
      title,
      summary,
      details,
      risk_level: riskLevel(config["risk_level"]),
      status: "pending",
      ...(expiry ? { expires_at: expiry } : {}),
    })
    .select("id")
    .maybeSingle();
  if (approvalError || !approval?.id) {
    await args.db
      .from("workflow_step_runs")
      .update({
        status: "failed",
        error: "Could not create approval request.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", stepRun.id);
    throw new Error(approvalError?.message ?? "Could not create the approval request.");
  }

  const { data: paused, error: pauseError } = await args.db
    .from("workflow_runs")
    .update({
      status: "waiting_for_approval",
      waiting_approval_request_id: approval.id,
      waiting_step_id: args.step.id,
      step_results: args.completed,
      completed_at: null,
    })
    .eq("id", args.runId)
    .eq("user_id", args.userId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (pauseError || !paused?.id) {
    await args.db
      .from("approval_requests")
      .update({
        status: "expired",
        decided_at: new Date().toISOString(),
        decision_note: "Workflow was no longer eligible to pause.",
      })
      .eq("id", approval.id)
      .eq("status", "pending");
    throw new Error(pauseError?.message ?? "Workflow could not enter approval state.");
  }

  await notify({
    userId: args.userId,
    orgId: args.orgId,
    type: "agent.input_required",
    title,
    body: summary,
    link: "/mission-control",
    metadata: {
      workflow_id: args.workflowId,
      run_id: args.runId,
      step_id: args.step.id,
      approval_request_id: approval.id,
    },
  });

  return {
    kind: "paused_for_approval",
    approvalRequestId: approval.id as string,
    stepRunId: stepRun.id as string,
    stepId: args.step.id,
  };
}
