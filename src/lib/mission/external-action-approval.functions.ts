import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  executeApprovedAction,
  type ApprovedActionType,
} from "@/lib/integrations/approved-action.server";
import {
  executeApprovedGitHubAction,
  type ApprovedGitHubActionType,
} from "@/lib/integrations/github-approved-action.server";
import { notify } from "@/lib/notifications/notify.server";

type Sb = { from: (t: string) => any };
type ExternalActionType = ApprovedActionType | ApprovedGitHubActionType;

const GITHUB_EXECUTABLE = new Set<ApprovedGitHubActionType>([
  "github_branch_create",
  "github_file_create",
  "github_file_update",
]);

const EXECUTABLE = new Set<ExternalActionType>([
  "calendar_create",
  "slack_post",
  "hubspot_contact_update",
  "hubspot_deal_update",
  "asana_task_create",
  "asana_task_update",
  "linear_issue_create",
  "linear_issue_update",
  "notion_page_create",
  ...GITHUB_EXECUTABLE,
]);

function safeDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function actionType(value: unknown): ExternalActionType {
  const action = String(value ?? "") as ExternalActionType;
  if (!EXECUTABLE.has(action)) throw new Error("This approval has no executable connected-service action");
  return action;
}

async function executeExternalAction(
  userId: string,
  type: ExternalActionType,
  details: Record<string, unknown>,
) {
  if (GITHUB_EXECUTABLE.has(type as ApprovedGitHubActionType)) {
    return executeApprovedGitHubAction(userId, {
      actionType: type as ApprovedGitHubActionType,
      details,
    });
  }
  return executeApprovedAction(userId, {
    actionType: type as ApprovedActionType,
    details,
  });
}

async function audit(
  sb: Sb,
  userId: string,
  approval: any,
  action: string,
  status: string,
  metadata: Record<string, unknown>,
) {
  await sb.from("mission_audit_logs").insert({
    user_id: userId,
    agent_id: approval.agent_id ?? null,
    action,
    target_type: "approval_request",
    target_id: approval.id,
    status,
    metadata: { task_id: approval.task_id ?? null, action_type: approval.action_type, ...metadata },
  });
}

async function updateTask(sb: Sb, userId: string, taskId: string | null, status: string, result?: unknown) {
  if (!taskId) return;
  await sb
    .from("personal_tasks")
    .update({
      status,
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...(result === undefined ? {} : { result }),
    })
    .eq("id", taskId)
    .eq("user_id", userId);
}

export const decideExternalActionApproval = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; decision: "approve" | "reject"; note?: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("Approval request id is required");
    if (input?.decision !== "approve" && input?.decision !== "reject") throw new Error("Invalid decision");
    return {
      id,
      decision: input.decision,
      note: typeof input.note === "string" ? input.note.slice(0, 1000) : null,
    };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const current = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (current.error) throw new Error(current.error.message);
    const approval = current.data;
    if (!approval) throw new Error("Approval request not found");
    if (approval.status !== "pending") throw new Error("This request has already been decided");
    const type = actionType(approval.action_type);

    if (data.decision === "reject") {
      const rejected = await sb
        .from("approval_requests")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString(),
          decided_by: userId,
          decision_note: data.note,
          execution_status: null,
          execution_error: null,
        })
        .eq("id", data.id)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (rejected.error) throw new Error(rejected.error.message);
      if (!rejected.data) throw new Error("This request has already been decided");
      await updateTask(sb, userId, approval.task_id ?? null, "cancelled");
      await audit(sb, userId, approval, "external_action_rejected", "success", {});
      return { status: "rejected" as const, execution: null };
    }

    // Atomically claim the human decision before any provider side effect. This
    // is the single-use guard against double-click/two-tab duplicate writes.
    const claim = await sb
      .from("approval_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: userId,
        decision_note: data.note,
        execution_status: "executing",
        execution_error: null,
        execution_result: null,
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) throw new Error("This request has already been decided");

    const execution = await executeExternalAction(
      userId,
      type,
      safeDetails(claim.data.details),
    );

    await sb
      .from("approval_requests")
      .update({
        execution_status: execution.ok ? "succeeded" : "failed",
        executed_at: new Date().toISOString(),
        execution_error: execution.ok ? null : (execution.error ?? "External action failed").slice(0, 1000),
        execution_result: execution.ok
          ? { provider: execution.provider ?? null, ...(execution.result ?? {}) }
          : { provider: execution.provider ?? null },
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "approved")
      .eq("execution_status", "executing");

    await updateTask(
      sb,
      userId,
      approval.task_id ?? null,
      execution.ok ? "completed" : "failed",
      execution.ok
        ? { external_action: { action_type: type, provider: execution.provider ?? null, ...(execution.result ?? {}) } }
        : { error: execution.error ?? "External action failed" },
    );

    await audit(
      sb,
      userId,
      approval,
      execution.ok ? "external_action_executed" : "external_action_failed",
      execution.ok ? "success" : "failed",
      { provider: execution.provider ?? null, error: execution.error ?? null },
    );

    await notify({
      userId,
      type: "approval.decided",
      title: execution.ok ? "Approved action completed" : "Approved action needs attention",
      body: execution.ok
        ? `${approval.title} completed${execution.provider ? ` through ${execution.provider}` : ""}.`
        : `${approval.title} was approved, but the provider action failed. ${execution.error ?? "Reconnect the integration and retry."}`.slice(0, 1000),
      link: "/mission-control",
      metadata: { approval_request_id: approval.id, provider: execution.provider ?? null, execution_ok: execution.ok },
    });

    return {
      status: "approved" as const,
      execution: {
        ok: execution.ok,
        provider: execution.provider ?? null,
        error: execution.error ?? null,
      },
    };
  });

export const retryExternalApprovedAction = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("Approval request id is required");
    return { id };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const current = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (current.error) throw new Error(current.error.message);
    const approval = current.data;
    if (!approval || approval.status !== "approved" || approval.execution_status !== "failed") {
      throw new Error("This approved action is not eligible for retry");
    }
    const type = actionType(approval.action_type);

    // Retry claims only the already-approved immutable request payload. The UI
    // cannot supply changed provider action details here.
    const claim = await sb
      .from("approval_requests")
      .update({ execution_status: "executing", execution_error: null })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "approved")
      .eq("execution_status", "failed")
      .select("*")
      .maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) throw new Error("This action is already being retried");

    const execution = await executeExternalAction(
      userId,
      type,
      safeDetails(claim.data.details),
    );

    await sb
      .from("approval_requests")
      .update({
        execution_status: execution.ok ? "succeeded" : "failed",
        executed_at: new Date().toISOString(),
        execution_error: execution.ok ? null : (execution.error ?? "External action failed").slice(0, 1000),
        execution_result: execution.ok
          ? { provider: execution.provider ?? null, ...(execution.result ?? {}) }
          : { provider: execution.provider ?? null },
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "approved")
      .eq("execution_status", "executing");

    await updateTask(
      sb,
      userId,
      approval.task_id ?? null,
      execution.ok ? "completed" : "failed",
      execution.ok
        ? { external_action: { action_type: type, provider: execution.provider ?? null, ...(execution.result ?? {}) } }
        : { error: execution.error ?? "External action failed" },
    );
    await audit(
      sb,
      userId,
      approval,
      execution.ok ? "external_action_retry_succeeded" : "external_action_retry_failed",
      execution.ok ? "success" : "failed",
      { provider: execution.provider ?? null, error: execution.error ?? null },
    );

    return {
      ok: execution.ok,
      provider: execution.provider ?? null,
      error: execution.error ?? null,
    };
  });