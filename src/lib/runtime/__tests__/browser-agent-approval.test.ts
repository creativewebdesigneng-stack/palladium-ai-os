import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';
vi.mock('@/lib/mission/personal-task-approval.server', () => ({ pauseForPersonalTaskApproval: vi.fn(async () => ({})) }));
vi.mock('@/lib/platform/entitlements.server', () => ({ getEntitlements: vi.fn(async () => ({ planCode: 'explorer' })) }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAuditRequired: vi.fn(async () => 'audit') }));
vi.mock('../tools.server', () => ({ executeTool: vi.fn(async () => ({ ok: true, output: { simulated: false, text: 'genuine fixture' } })), resolveGrantedTools: vi.fn() }));
vi.mock('../runtime.server', () => ({ executeRun: vi.fn(async () => ({ status: 'succeeded' })), failRun: vi.fn() }));
import { pauseAgentBrowserCalls, resumeAgentBrowserApproval } from '../browser-approval.server';
import { pauseForPersonalTaskApproval } from '@/lib/mission/personal-task-approval.server';
import { executeTool, resolveGrantedTools } from '../tools.server';
import { executeRun } from '../runtime.server';
const call = { id: 'call', name: 'browser_task', arguments: { steps: [{ action: 'navigate', url: 'https://httpbingo.org/html' }, { action: 'extract', selector: 'h1' }] } };
const grant = { slug: 'browser_task', requiresApproval: true, allowedDomains: ['httpbingo.org'], spendCap: null };
function setup(overrides = {}) {
  return createFakeSupabase({ personal_agents: [{ id: 'agent', user_id: 'owner', status: 'draft' }],
    agent_tasks: [{ id: 'run', user_id: 'owner', agent_id: 'agent', task_id: null, cancel_requested: false,
      status: 'waiting_for_approval', waiting_approval_request_id: 'approval',
      approval_resume_state: { version: 1, provider: 'groq', model: 'openai/gpt-oss-20b', messages: [], usage: { input: 7, output: 8 }, toolCalls: 1, pendingCall: call }, ...overrides }],
    approval_requests: [{ id: 'approval', user_id: 'owner', agent_id: 'agent', action_type: 'agent_runtime_tool', status: 'approved', details: { agent_task_id: 'run', tool_call_id: 'call', tool_name: 'browser_task' } }] });
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(resolveGrantedTools).mockResolvedValue({ defs: [], grants: new Map([['browser_task', grant]]) }); });
describe('browser approval through the existing immutable payload lifecycle', () => {
  it('pauses before any gated browser effects and stores the exact model call', async () => {
    const sb = setup(); const run: any = { taskId: 'run', agent: { id: 'agent' }, provider: 'groq', model: '20b', tools: { grants: new Map([['browser_task', grant]]) } };
    await pauseAgentBrowserCalls({ sb, userId: 'owner', run, result: { text: '', toolCalls: [call] } as any, messages: [], usage: { input: 1, output: 2 }, toolCalls: 1 });
    expect(pauseForPersonalTaskApproval).toHaveBeenCalledWith(expect.objectContaining({ personalTaskId: null, runtimeAgent: true, resumeState: expect.objectContaining({ pendingCall: call }) }));
    expect(executeTool).not.toHaveBeenCalled();
  });
  it('executes only the saved payload once, with freshly resolved restrictions; future calls keep approval', async () => {
    const sb = setup(); await resumeAgentBrowserApproval({ sb, userId: 'owner', approvalRequestId: 'approval', decision: 'approved' });
    expect(executeTool).toHaveBeenCalledWith('browser_task', call.arguments, expect.objectContaining({ taskId: 'run' }), expect.any(Map));
    const once = vi.mocked(executeTool).mock.calls[0]![3]!.get('browser_task');
    expect(once).toMatchObject({ requiresApproval: false, allowedDomains: ['httpbingo.org'] });
    expect(grant.requiresApproval).toBe(true);
    expect(executeRun).toHaveBeenCalledWith(expect.objectContaining({ resumedUsage: { input: 7, output: 8 }, resumedToolCalls: 1 }));
    await expect(resumeAgentBrowserApproval({ sb, userId: 'owner', approvalRequestId: 'approval', decision: 'approved' })).rejects.toThrow('stale');
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(sb.tables['agent_tasks']![0]!['checkpoint_state']).toBeNull();
  });
  it.each([{ cancel_requested: true }, { agent_id: 'other' }])('rejects cancelled or mismatched associations', async override => {
    await expect(resumeAgentBrowserApproval({ sb: setup(override), userId: 'owner', approvalRequestId: 'approval', decision: 'approved' })).rejects.toThrow('mismatched');
    expect(executeTool).not.toHaveBeenCalled();
  });
  it('rejects a different owner and revoked tool before effects', async () => {
    await expect(resumeAgentBrowserApproval({ sb: setup(), userId: 'other', approvalRequestId: 'approval', decision: 'approved' })).rejects.toThrow('mismatched');
    vi.mocked(resolveGrantedTools).mockResolvedValueOnce({ defs: [], grants: new Map() });
    await expect(resumeAgentBrowserApproval({ sb: setup(), userId: 'owner', approvalRequestId: 'approval', decision: 'approved' })).rejects.toThrow('no longer enabled');
    expect(executeTool).not.toHaveBeenCalled();
  });
  it('continues a rejected decision without executing the browser', async () => {
    const sb = setup(); sb.tables['approval_requests']![0]!['status'] = 'rejected';
    await resumeAgentBrowserApproval({ sb, userId: 'owner', approvalRequestId: 'approval', decision: 'rejected' });
    expect(executeTool).not.toHaveBeenCalled(); expect(executeRun).toHaveBeenCalled();
  });
});
