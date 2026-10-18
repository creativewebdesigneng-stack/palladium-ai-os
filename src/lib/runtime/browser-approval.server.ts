import { pauseForPersonalTaskApproval } from '@/lib/mission/personal-task-approval.server';
import { getEntitlements } from '@/lib/platform/entitlements.server';
import { writeAuditRequired } from '@/lib/platform/audit.server';
import { executeTool, resolveGrantedTools } from './tools.server';
import { compactToolResultForModel } from './atomic-loop-guard.server';
import { parseDurableRunCheckpoint, invalidateDurableRunCheckpoint } from './run-checkpoint.server';
import type { ChatMessage, ChatResult } from './model-gateway.server';
import type { PreparedRun } from './runtime.server';

type Sb = { from: (table: string) => any };

/** Reuse the existing immutable payload/owner-decision approval lifecycle. */
export async function pauseAgentBrowserCalls(args: {
  sb: Sb; userId: string; run: PreparedRun; result: ChatResult;
  messages: ChatMessage[]; usage: { input: number; output: number }; toolCalls: number;
}) {
  const pending = args.result.toolCalls.find(call =>
    ['browser', 'browser_task'].includes(call.name) && args.run.tools.grants.get(call.name)?.requiresApproval);
  if (!pending) return null;
  const messages: ChatMessage[] = [...args.messages, { role: 'assistant', content: args.result.text,
    tool_calls: args.result.toolCalls, ...(args.result.geminiContinuation ? { geminiContinuation: args.result.geminiContinuation } : {}) }];
  await pauseForPersonalTaskApproval({ sb: args.sb, userId: args.userId, orgId: args.run.orgId,
    personalTaskId: null, runtimeAgent: true, runId: args.run.taskId, agentId: args.run.agent.id,
    agentName: args.run.agent.name, call: pending, resumeState: {
      version: 1, provider: args.run.provider, model: args.run.model, messages,
      usage: args.usage, toolCalls: args.toolCalls, pendingCall: pending,
      skippedCalls: args.result.toolCalls.filter(call => call.id !== pending.id),
    } });
  const { data, error } = await args.sb.from('agent_tasks').select('*')
    .eq('id', args.run.taskId).eq('user_id', args.userId).maybeSingle();
  if (error || !data) throw new Error('Could not confirm the paused browser run.');
  return data;
}

export async function resumeAgentBrowserApproval(args: {
  sb: Sb; userId: string; approvalRequestId: string; decision: 'approved' | 'rejected'; note?: string | null;
}): Promise<any> {
  const { data: run, error } = await args.sb.from('agent_tasks').select('*')
    .eq('user_id', args.userId).eq('waiting_approval_request_id', args.approvalRequestId).eq('status', 'waiting_for_approval').maybeSingle();
  const { data: approval, error: approvalError } = await args.sb.from('approval_requests').select('*')
    .eq('id', args.approvalRequestId).eq('user_id', args.userId).maybeSingle();
  const state = run?.approval_resume_state;
  const call = state?.pendingCall;
  if (error || approvalError || !run || run.cancel_requested || run.task_id || !state || state.version !== 1 ||
    !Array.isArray(state.messages) || !call || !['browser', 'browser_task'].includes(call.name) ||
    !call.arguments || typeof call.arguments !== 'object' || Array.isArray(call.arguments) ||
    approval?.action_type !== 'agent_runtime_tool' || approval.status !== args.decision ||
    approval.agent_id !== run.agent_id || approval.details?.agent_task_id !== run.id ||
    approval.details?.tool_call_id !== call.id || approval.details?.tool_name !== call.name) {
    throw new Error('The browser approval is stale, cancelled or mismatched.');
  }
  const { data: agent, error: agentError } = await args.sb.from('personal_agents').select('*')
    .eq('id', run.agent_id).eq('user_id', args.userId).maybeSingle();
  if (agentError || !agent || agent.status === 'archived') throw new Error('Agent is unavailable.');
  const orgId = agent.org_id_fk ?? agent.org_id ?? null;
  const ent = await getEntitlements(args.sb as never, args.userId, orgId);
  const tools = await resolveGrantedTools(args.sb, agent, ent.planCode);
  const grant = tools.grants.get(call.name);
  if (!grant) throw new Error('The browser tool is no longer enabled.');
  const { data: claimed, error: claimError } = await args.sb.from('agent_tasks')
    .update({ status: 'running', heartbeat_at: new Date().toISOString() })
    .eq('id', run.id).eq('user_id', args.userId).eq('status', 'waiting_for_approval')
    .eq('cancel_requested', false).eq('waiting_approval_request_id', args.approvalRequestId).select('id').maybeSingle();
  if (claimError || !claimed) throw new Error('This browser approval was already resumed.');
  const runtime = await import('./runtime.server');
  const prepared: PreparedRun = { agent, orgId, taskId: run.id, messages: state.messages,
    tools, provider: state.provider, model: state.model, startedAt: Date.now() };
  try {
    await writeAuditRequired({ userId: args.userId, agentId: agent.id, targetType: 'approval_request',
      targetId: approval.id, action: 'agent.browser_approval_decided', status: 'success',
      metadata: { runId: run.id, decision: args.decision, tool: call.name } });
    // A crash after dispatch must never replay the approved external action.
    await invalidateDurableRunCheckpoint({ sb: args.sb, taskId: run.id });
    let output: unknown = { rejected: true, error: 'The operator rejected this browser action.' };
    if (args.decision === 'approved') {
      // Only this locked call consumes approval. Future calls retain their grant.
      const approvedGrants = new Map(tools.grants);
      approvedGrants.set(call.name, { ...grant, requiresApproval: false });
      output = (await executeTool(call.name, call.arguments, { sb: args.sb, userId: args.userId,
        orgId, agentId: agent.id, taskId: run.id, allowedProviders: agent.allowed_providers ?? [] }, approvedGrants)).output;
    }
    const messages: ChatMessage[] = [...state.messages, { role: 'tool', tool_call_id: call.id,
      name: call.name, content: compactToolResultForModel(output) }];
    for (const skipped of state.skippedCalls ?? []) messages.push({ role: 'tool', tool_call_id: skipped.id,
      name: skipped.name, content: 'Deferred for operator approval. Request again if needed.' });
    const checkpoint = parseDurableRunCheckpoint(run.checkpoint_state);
    const task = checkpoint
      ? await (await import('./planner-runtime.server')).executePlannedRun({ sb: args.sb, userId: args.userId,
          run: { ...prepared, messages }, resumeCheckpoint: { ...checkpoint, messages,
            usage: state.usage, tool_call_count: state.toolCalls, tool_rounds: checkpoint.tool_rounds + 1 } })
      : await runtime.executeRun({ sb: args.sb, userId: args.userId, run: { ...prepared, messages },
          resumedUsage: state.usage, resumedToolCalls: state.toolCalls });
    return { status: task.status, runId: run.id, task };
  } catch (failure) {
    await runtime.failRun({ sb: args.sb, userId: args.userId, run: prepared, error: failure });
    throw failure;
  }
}
