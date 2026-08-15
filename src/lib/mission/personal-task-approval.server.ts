import { notify } from "@/lib/notifications/notify.server";
import type { ChatMessage, Provider } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };

export type PersonalTaskPendingToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type PersonalTaskApprovalResumeState = {
  version: 1;
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  usage: { input: number; output: number };
  toolCalls: number;
  pendingCall: PersonalTaskPendingToolCall;
  skippedCalls?: PersonalTaskPendingToolCall[];
};

export type PersonalTaskApprovalPause = {
  kind: "paused_for_approval";
  approvalRequestId: string;
  runId: string;
  toolName: string;
};

function bounded(value: unknown, fallback: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

function browserApprovalCopy(call: PersonalTaskPendingToolCall, agentName?: string | null) {
  if (call.name !== "browser_interact") return null;
  const url = typeof call.arguments["url"] === "string" ? call.arguments["url"] : "";
  let host = "an external site";
  try {
    host = new URL(url).hostname.replace(/^www\./, "") || host;
  } catch {
    /* Invalid URLs are rejected again by the executor after approval. */
  }
  const steps = Array.isArray(call.arguments["steps"])
    ? call.arguments["steps"]
        .slice(0, 6)
        .map((step) =>
          step && typeof step === "object" && !Array.isArray(step)
            ? String((step as Record<string, unknown>)["action"] ?? "interaction")
            : "interaction",
        )
    : [];
  const sequence = steps.length ? steps.join(" → ") : "browser interaction";
  return {
    title: `${agentName ?? "Your personal agent"} wants to interact with ${host}`,
    summary: `Approve ${steps.length || 1} browser step${steps.length === 1 ? "" : "s"} (${sequence}) on ${host}. The exact approved payload is locked to this paused run; typed text is not copied into the approval or audit record. Checkout and payment interactions are refused.`,
    extraDetails: {
      browser_host: host,
      browser_step_count: steps.length,
      browser_actions: steps,
    },
  };
}

/**
 * Persists a personal-task tool approval without executing the tool.
 *
 * The approval request contains association identifiers only plus bounded,
 * non-secret display metadata. The exact resumable conversation/tool payload
 * stays on the owner-scoped agent_tasks ledger so a later decision can resume
 * the same run without replaying completed work.
 */
export async function pauseForPersonalTaskApproval(args: {
  sb: Sb;
  userId: string;
  orgId: string | null;
  personalTaskId: string;
  runId: string;
  agentId: string | null;
  agentName?: string | null;
  call: PersonalTaskPendingToolCall;
  resumeState: PersonalTaskApprovalResumeState;
}): Promise<PersonalTaskApprovalPause> {
  const browserCopy = browserApprovalCopy(args.call, args.agentName);
  const title = bounded(
    browserCopy?.title ?? `${args.agentName ?? "Your personal agent"} wants to use ${args.call.name}`,
    "Personal agent action needs approval",
    200,
  );
  const summary = bounded(
    browserCopy?.summary ?? `Approve this ${args.call.name} action to continue the same personal task run.`,
    "Approve this action to continue the personal task.",
    500,
  );

  const details = {
    personal_task_id: args.personalTaskId,
    agent_task_id: args.runId,
    tool_call_id: args.call.id,
    tool_name: args.call.name,
    ...(browserCopy?.extraDetails ?? {}),
  };

  const { data: approval, error: approvalError } = await args.sb
    .from("approval_requests")
    .insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      task_id: args.personalTaskId,
      action_type: "personal_task_tool",
      title,
      summary,
      details,
      risk_level: "medium",
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (approvalError || !approval?.id) {
    throw new Error(approvalError?.message ?? "Could not create the personal-task approval request.");
  }

  const { data: paused, error: pauseError } = await args.sb
    .from("agent_tasks")
    .update({
      status: "waiting_for_approval",
      waiting_approval_request_id: approval.id,
      approval_resume_state: args.resumeState,
      heartbeat_at: new Date().toISOString(),
      completed_at: null,
    })
    .eq("id", args.runId)
    .eq("user_id", args.userId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();

  if (pauseError || !paused?.id) {
    await args.sb
      .from("approval_requests")
      .update({
        status: "expired",
        decided_at: new Date().toISOString(),
        decision_note: "The personal task was no longer eligible to pause.",
      })
      .eq("id", approval.id)
      .eq("user_id", args.userId)
      .eq("status", "pending");
    throw new Error(pauseError?.message ?? "Personal task could not enter approval state.");
  }

  await notify({
    userId: args.userId,
    orgId: args.orgId,
    type: "agent.input_required",
    title,
    body: summary,
    link: "/mission-control",
    metadata: {
      personal_task_id: args.personalTaskId,
      agent_task_id: args.runId,
      approval_request_id: approval.id,
      tool_name: args.call.name,
    },
  });

  return {
    kind: "paused_for_approval",
    approvalRequestId: String(approval.id),
    runId: args.runId,
    toolName: args.call.name,
  };
}
