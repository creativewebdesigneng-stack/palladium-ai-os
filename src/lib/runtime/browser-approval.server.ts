import { z } from 'zod';
import { writeAuditRequired } from '@/lib/platform/audit.server';
import type { ToolContext } from './tools-core.server';

const publicUrl = z.string().url().max(2000).refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
}, 'Approved browsing requires a plain HTTPS URL without credentials or query data.');
const step = z.object({
  action: z.enum(['navigate', 'read', 'extract']), url: publicUrl.optional(),
  selector: z.string().max(500).optional(), label: z.string().max(120).optional(),
  fields: z.array(z.object({ name: z.string().max(80), selector: z.string().max(500), required: z.boolean().optional() }).strict()).max(16).optional(),
}).strict();
// The executable browser_task contract permits either a top-level starting URL
// or a URL on the first navigate step. Keep accepting both while narrowing the
// *approved* operation to read-only, plain HTTPS navigation/extraction.
const inputSchema = z.object({
  url: publicUrl.optional(),
  steps: z.array(step).min(2).max(8),
  max_steps: z.number().int().min(2).max(8).optional(),
  persist_session: z.literal(false).optional(),
}).strict().refine(value => {
  const first = value.steps[0];
  return first?.action === 'navigate'
    && Boolean(first.url ?? value.url)
    && (!first.url || !value.url || first.url === value.url)
    && value.steps.some(s => s.action === 'read' || s.action === 'extract');
}, 'Approval requires initial HTTPS navigation, a read or extraction step, and matching starting URLs.');

export function approvedBrowserInput(input: unknown) {
  const { url, steps, ...options } = inputSchema.parse(input);
  // Persist only the canonical approved step payload. Do not carry a second,
  // possibly different, top-level navigation target into the continuation.
  return { steps: [{ ...steps[0]!, url: steps[0]!.url ?? url }, ...steps.slice(1)], ...options };
}
type Sb = { from: (table: string) => any };

/** Uses the existing immutable approval ledger; no browser runs while queueing. */
export async function queueBrowserApproval(input: unknown, ctx: ToolContext) {
  const payload = approvedBrowserInput(input);
  if (!ctx.taskId) throw new Error('Browser approval requires an existing agent task.');
  const { isDomainAllowed } = await import('@/lib/mission/browser-agent');
  if (!ctx.allowedDomains?.length || payload.steps.some(s => s.url && !isDomainAllowed(s.url, ctx.allowedDomains ?? []))) {
    throw new Error('Browser approval is outside the current domain policy.');
  }
  const { data: task, error: taskError } = await ctx.sb.from('agent_tasks').select('id,status,cancel_requested,waiting_approval_request_id')
    .eq('id', ctx.taskId).eq('agent_id', ctx.agentId).eq('user_id', ctx.userId).maybeSingle();
  if (taskError || !task || task.waiting_approval_request_id || task.cancel_requested || !['running', 'waiting_for_tool'].includes(task.status)) throw new Error('The browser task is no longer active.');
  await writeAuditRequired({ userId: ctx.userId, agentId: ctx.agentId, targetType: 'agent_task', targetId: ctx.taskId,
    action: 'agent.browser_approval_requested', metadata: { actions: payload.steps.map(s => s.action) } });
  const { data: approval, error } = await ctx.sb.from('approval_requests').insert({
    user_id: ctx.userId, org_id: ctx.orgId, agent_id: ctx.agentId, task_id: null,
    action_type: 'agent_browser_task', title: 'Approve bounded browser navigation and extraction',
    summary: `Read-only browsing on ${new URL(payload.steps[0]!.url!).hostname}. No forms, logins, downloads or persistent browser profile.`,
    details: { kind: 'agent_browser_task', agent_task_id: ctx.taskId, input: payload },
    risk_level: 'low', status: 'pending', expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  }).select('id').maybeSingle();
  if (error || !approval?.id) throw new Error('Could not queue browser approval.');
  const paused = await ctx.sb.from('agent_tasks').update({ waiting_approval_request_id: approval.id })
    .eq('id', ctx.taskId).eq('user_id', ctx.userId).eq('cancel_requested', false).in('status', ['running', 'waiting_for_tool']).select('id').maybeSingle();
  if (paused.error || !paused.data) {
    // A concurrent cancellation can win after the approval INSERT. Never leave
    // that orphaned request actionable in Mission Control.
    const closed = await ctx.sb.from('approval_requests').update({ status: 'cancelled' })
      .eq('id', approval.id).eq('user_id', ctx.userId).eq('agent_id', ctx.agentId)
      .eq('status', 'pending').select('id').maybeSingle();
    if (closed.error || !closed.data) {
      throw new Error('Could not link or safely cancel the unbound browser approval.');
    }
    throw new Error('Could not link browser approval to its active task.');
  }
  return { approval_request_id: approval.id, status: 'awaiting_approval', requires_approval: true };
}

/** Called only after the Approval Centre's single-use pending -> executing claim. */
export async function executeApprovedBrowserTask(args: { sb: Sb; userId: string; approvalRequestId: string }) {
  let claimedTask: string | null = null;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as unknown as Sb;
  try {
    const { data: approval, error } = await args.sb.from('approval_requests').select('*')
      .eq('id', args.approvalRequestId).eq('user_id', args.userId).maybeSingle();
    if (error || !approval || approval.action_type !== 'agent_browser_task' || approval.status !== 'approved' || approval.execution_status !== 'executing') throw new Error('Browser approval is not claimed for execution.');
    if (!approval.expires_at || new Date(approval.expires_at).getTime() <= Date.now()) throw new Error('Browser approval has expired.');
    const input = approvedBrowserInput(approval.details?.input);
    const taskId = approval.details?.agent_task_id;
    const { data: task, error: taskError } = await args.sb.from('agent_tasks').select('*')
      .eq('id', taskId).eq('user_id', args.userId).eq('agent_id', approval.agent_id).maybeSingle();
    if (taskError || !task || task.status !== 'waiting_for_approval' || task.cancel_requested || task.waiting_approval_request_id !== approval.id) throw new Error('The approved browser task is cancelled, stale or mismatched.');
    const snapshot = task.approval_resume_state;
    if (!snapshot || snapshot.version !== 1 || snapshot.kind !== 'agent_browser_task' || !Array.isArray(snapshot.messages) || snapshot.provider !== task.provider || snapshot.model !== task.model) throw new Error('Browser task continuation is missing or mismatched.');
    const { compactToolResultForModel } = await import('./atomic-loop-guard.server');
    const messages = snapshot.messages.map((message: any) => ({ ...message }));
    const pending = messages.findLast((message: any) => {
      if (message.role !== 'tool' || message.name !== 'browser_task') return false;
      try { return JSON.parse(message.content).approval_request_id === approval.id; } catch { return false; }
    });
    if (!pending) throw new Error('Approved browser continuation does not contain this request.');
    claimedTask = taskId;
    const { data: agent, error: agentError } = await args.sb.from('personal_agents').select('*')
      .eq('id', approval.agent_id).eq('user_id', args.userId).maybeSingle();
    if (agentError || !agent || agent.status === 'archived') throw new Error('The browser agent is no longer available.');
    const { getEntitlements } = await import('@/lib/platform/entitlements.server');
    const { resolveGrantedTools, executeTool } = await import('./tools.server');
    const entitlements = await getEntitlements(args.sb as never, args.userId, task.org_id ?? null);
    const tools = await resolveGrantedTools(args.sb, agent, entitlements.planCode);
    const grant = tools.grants.get('browser_task');
    const { isDomainAllowed } = await import('@/lib/mission/browser-agent');
    if (!grant || !grant.allowedDomains.length || input.steps.some(s => s.url && !isDomainAllowed(s.url, grant.allowedDomains))) throw new Error('Current browser permissions no longer allow the approved task.');
    await writeAuditRequired({ userId: args.userId, agentId: agent.id, action: 'agent.browser_approval_execution', targetType: 'agent_task', targetId: taskId, metadata: { approval_request_id: approval.id } });
    const claim = await db.from('agent_tasks').update({ status: 'running', heartbeat_at: new Date().toISOString() })
      .eq('id', taskId).eq('user_id', args.userId).eq('status', 'waiting_for_approval').eq('waiting_approval_request_id', approval.id).eq('cancel_requested', false).select('id').maybeSingle();
    if (claim.error || !claim.data) throw new Error('This browser task has already resumed or was cancelled.');
    claimedTask = taskId;
    // Waive only this exact, immutable approved call; current domain/plan/tool gates still apply.
    const approvedGrants = new Map(tools.grants); approvedGrants.set('browser_task', { ...grant, requiresApproval: false });
    const executed = await executeTool('browser_task', input, { sb: args.sb, userId: args.userId, agentId: agent.id, orgId: task.org_id ?? null, taskId, allowedProviders: agent.allowed_providers ?? [] }, approvedGrants);
    const output = executed.output as Record<string, any> | null;
    if (!executed.ok || !output || output['simulated'] !== false || output['result']?.ok !== true || output['result']?.completed_steps !== input.steps.length || !Array.isArray(output['result']?.outputs) || output['result'].outputs.length !== input.steps.length) throw new Error('Approved browser task did not return verified real-browser success.');
    await writeAuditRequired({ userId: args.userId, agentId: agent.id, action: 'agent.browser_approval_result', targetType: 'agent_task', targetId: taskId, metadata: { approval_request_id: approval.id, provider: output['provider'], simulated: false } });
    pending.content = compactToolResultForModel(output);
    const { executeRun } = await import('./runtime.server');
    const { normaliseProvider } = await import('./model-gateway.server');
    const run = { agent, taskId, orgId: task.org_id ?? null, tools, provider: normaliseProvider(task.provider), model: task.model,
      messages, startedAt: Number(snapshot.startedAt) || new Date(task.created_at).getTime() };
    let resumed;
    if (snapshot.planner) {
      const { executePlannedRun } = await import('./planner-runtime.server');
      const { createDurableRunCheckpoint } = await import('./run-checkpoint.server');
      const checkpoint = createDurableRunCheckpoint({ phase: 'tool_boundary', messages, plan: snapshot.planner.plan,
        toolRounds: snapshot.planner.toolRounds, toolCallCount: Number(task.tool_calls ?? 1),
        usage: { input: Number(task.tokens_in ?? 0), output: Number(task.tokens_out ?? 0) } });
      resumed = await executePlannedRun({ sb: args.sb, userId: args.userId, run, resumeCheckpoint: checkpoint, reasoningControl: snapshot.planner.reasoningControl });
    } else {
      resumed = await executeRun({ sb: args.sb, userId: args.userId, run,
        initialUsage: { input: Number(task.tokens_in ?? 0), output: Number(task.tokens_out ?? 0) },
        initialToolCallCount: Number(task.tool_calls ?? 1) });
    }
    return { ok: true, provider: String(output['provider']), result: { agent_task_id: taskId, simulated: false, task_status: resumed.status } };
  } catch (error) {
    if (claimedTask) await db.from('agent_tasks').update({ status: 'failed', error: 'Approved browser execution failed. Inspect approval and tool evidence.', completed_at: new Date().toISOString() }).eq('id', claimedTask).eq('user_id', args.userId).in('status', ['running', 'waiting_for_approval']).eq('waiting_approval_request_id', args.approvalRequestId).eq('cancel_requested', false);
    return { ok: false, provider: 'playwright', error: error instanceof Error ? error.message : 'Browser approval execution failed.' };
  }
}

export async function rejectBrowserApproval(args: { sb: Sb; userId: string; approvalRequestId: string; agentId: string; taskId: string }) {
  const result = await args.sb.from('agent_tasks').update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', args.taskId).eq('user_id', args.userId).eq('agent_id', args.agentId)
    .eq('waiting_approval_request_id', args.approvalRequestId).eq('status', 'waiting_for_approval').select('id').maybeSingle();
  if (result.error || !result.data) throw new Error('Could not confirm cancellation of the rejected browser task.');
}
