import { resumePersonalTaskApproval, type PersonalTaskExecutionResult } from "./personal-task-execution.server";

type Sb = { from: (table: string) => any };

type Decision = "approved" | "rejected";

type PersonalTaskApprovalDetails = {
  personal_task_id: string | null;
  runtime_agent?: boolean;
  agent_task_id: string;
  tool_call_id: string;
  tool_name: string;
};

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 && id.length <= 128 ? id : null;
}

function detailsOf(value: unknown): PersonalTaskApprovalDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const personal_task_id = asId(row["personal_task_id"]);
  const agent_task_id = asId(row["agent_task_id"]);
  const tool_call_id = asId(row["tool_call_id"]);
  const tool_name = asId(row["tool_name"]);
  if ((!personal_task_id && row["runtime_agent"] !== true) || !agent_task_id || !tool_call_id || !tool_name) return null;
  return { personal_task_id, agent_task_id, tool_call_id, tool_name, runtime_agent: row["runtime_agent"] === true };
}

/**
 * Decides an approval raised from inside a running personal-agent conversation
 * and resumes that exact `agent_tasks` row. All association checks happen
 * before the pending -> decided transition, and every read/write is owner scoped.
 */
export async function decidePersonalTaskToolApproval(args: {
  sb: Sb;
  userId: string;
  approvalRequestId: string;
  decision: Decision;
  note?: string | null;
}): Promise<{
  status: Decision;
  execution: PersonalTaskExecutionResult;
}> {
  const { data: approval, error: approvalError } = await args.sb
    .from("approval_requests")
    .select("id,user_id,status,action_type,task_id,details")
    .eq("id", args.approvalRequestId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (approvalError) throw new Error(approvalError.message);
  if (!approval) throw new Error("Approval request not found.");
  if (approval.user_id !== args.userId) throw new Error("Only the task owner can decide this approval.");
  if (!["personal_task_tool", "agent_runtime_tool"].includes(approval.action_type))
    throw new Error("This approval is not a resumable personal-task tool approval.");
  if (approval.status !== "pending") throw new Error("This approval request has already been decided.");

  const details = detailsOf(approval.details);
  if (!details || (approval.action_type === "agent_runtime_tool") !== Boolean(details.runtime_agent) || approval.task_id !== details.personal_task_id)
    throw new Error("This approval is not linked to a valid personal task run.");

  const { data: run, error: runError } = await args.sb
    .from("agent_tasks")
    .select("id,user_id,task_id,status,waiting_approval_request_id,approval_resume_state")
    .eq("id", details.agent_task_id)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!run || run.user_id !== args.userId) throw new Error("Personal task run not found.");
  if (run.task_id !== details.personal_task_id)
    throw new Error("Approval does not belong to this personal task run.");
  if (run.status !== "waiting_for_approval" || run.waiting_approval_request_id !== approval.id)
    throw new Error("This personal task is no longer waiting for this approval.");

  const resumeState = run.approval_resume_state;
  if (!resumeState || typeof resumeState !== "object" || Array.isArray(resumeState))
    throw new Error("Personal task approval resume state is missing.");
  const resumeRow = resumeState as Record<string, unknown>;
  const pendingCall = resumeRow["pendingCall"];
  if (!pendingCall || typeof pendingCall !== "object" || Array.isArray(pendingCall))
    throw new Error("Personal task approval tool state is missing.");
  const pendingRow = pendingCall as Record<string, unknown>;
  if (pendingRow["id"] !== details.tool_call_id || pendingRow["name"] !== details.tool_name)
    throw new Error("Approval tool association is stale or mismatched.");

  const now = new Date().toISOString();
  const note = args.note?.trim().slice(0, 500) || null;
  const { data: decided, error: decisionError } = await args.sb
    .from("approval_requests")
    .update({
      status: args.decision,
      decided_at: now,
      decided_by: args.userId,
      decision_note: note,
    })
    .eq("id", approval.id)
    .eq("user_id", args.userId)
    .eq("status", "pending")
    .select("id,status")
    .maybeSingle();
  if (decisionError) throw new Error(decisionError.message);
  if (!decided) throw new Error("This approval request has already been decided.");

  const resume = details.runtime_agent
    ? (await import("@/lib/runtime/browser-approval.server")).resumeAgentBrowserApproval
    : resumePersonalTaskApproval;
  const execution = await resume({
    sb: args.sb,
    userId: args.userId,
    approvalRequestId: approval.id,
    decision: args.decision,
    note,
  });

  return { status: args.decision, execution };
}
