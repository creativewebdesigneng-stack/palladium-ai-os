import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';
const calls = vi.hoisted(() => ({ execute: vi.fn(), resolve: vi.fn(), audit: vi.fn(), complete: vi.fn().mockResolvedValue({ status: 'succeeded' }), planned: vi.fn().mockResolvedValue({ status: 'succeeded' }) }));
let db: ReturnType<typeof createFakeSupabase>;
vi.mock('@/integrations/supabase/client.server', () => ({ get supabaseAdmin() { return db; } }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAuditRequired: calls.audit }));
vi.mock('@/lib/platform/entitlements.server', () => ({ getEntitlements: vi.fn().mockResolvedValue({ planCode: 'builder' }) }));
vi.mock('../tools.server', () => ({ executeTool: calls.execute, resolveGrantedTools: calls.resolve }));
vi.mock('../runtime.server', () => ({ executeRun: calls.complete }));
vi.mock('../planner-runtime.server', () => ({ executePlannedRun: calls.planned }));
vi.mock('../run-checkpoint.server', () => ({ createDurableRunCheckpoint: (value: unknown) => value }));
import { approvedBrowserInput, queueBrowserApproval, executeApprovedBrowserTask, rejectBrowserApproval } from '../browser-approval.server';
const input = { steps: [{ action: 'navigate', url: 'https://httpbingo.org/html' }, { action: 'extract', selector: 'body' }] };
const args = () => ({ sb: db, userId: 'owner', approvalRequestId: 'approval' });
beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase({ approval_requests: [{ id: 'approval', user_id: 'owner', agent_id: 'agent', action_type: 'agent_browser_task', status: 'approved', execution_status: 'executing', expires_at: new Date(Date.now() + 60_000).toISOString(), details: { agent_task_id: 'task', input } }],
    agent_tasks: [{ id: 'task', user_id: 'owner', agent_id: 'agent', status: 'waiting_for_approval', waiting_approval_request_id: 'approval', cancel_requested: false, provider: 'groq', model: 'openai/gpt-oss-20b', created_at: new Date().toISOString(), approval_resume_state: { version: 1, kind: 'agent_browser_task', provider: 'groq', model: 'openai/gpt-oss-20b', messages: [{ role: 'tool', name: 'browser_task', content: JSON.stringify({ approval_request_id: 'approval' }) }] } }], personal_agents: [{ id: 'agent', user_id: 'owner', allowed_tools: ['browser'], requires_approval: true, status: 'draft' }] });
  calls.resolve.mockResolvedValue({ defs: [], grants: new Map([['browser_task', { slug: 'browser_task', requiresApproval: true, allowedDomains: ['httpbingo.org'], spendCap: 0 }]]) });
  calls.execute.mockResolvedValue({ ok: true, output: { provider: 'playwright', simulated: false, result: { ok: true, completed_steps: 2, outputs: [{ action: 'navigate', result: { ok: true } }, { action: 'extract', result: { text: 'Real extracted content' } }] } } });
});
describe('bounded browser approval input and queueing', () => {
  const startingUrl = 'https://httpbingo.org/html';

  it('normalizes the real model starting-URL shape without broadening approval scope', () => {
    const modelInput = {
      url: startingUrl, max_steps: 5,
      steps: [{ action: 'navigate', url: startingUrl }, { action: 'extract', selector: 'body' }],
    };
    expect(approvedBrowserInput(modelInput)).toEqual({
      max_steps: 5,
      steps: [{ action: 'navigate', url: startingUrl }, { action: 'extract', selector: 'body' }],
    });
    expect(approvedBrowserInput({
      url: startingUrl, steps: [{ action: 'navigate' }, { action: 'read' }],
    })).toEqual({
      steps: [{ action: 'navigate', url: startingUrl }, { action: 'read' }],
    });
  });

  it('queues the canonical read-only model payload and links the existing task', async () => {
    db.tables['agent_tasks'] = [{
      id: 'task', user_id: 'owner', agent_id: 'agent', status: 'waiting_for_tool',
      cancel_requested: false, waiting_approval_request_id: null,
    }];
    const modelInput = {
      url: startingUrl, max_steps: 5,
      steps: [{ action: 'navigate', url: startingUrl }, { action: 'extract', selector: 'body' }],
    };
    const result = await queueBrowserApproval(modelInput, {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedDomains: ['httpbingo.org'],
    } as unknown as Parameters<typeof queueBrowserApproval>[1]);
    expect(result).toMatchObject({ status: 'awaiting_approval', requires_approval: true });
    const row = db.tables['approval_requests']?.at(-1);
    expect(row).toMatchObject({
      id: result.approval_request_id, action_type: 'agent_browser_task', status: 'pending',
      details: { agent_task_id: 'task', input: {
        max_steps: 5,
        steps: [{ action: 'navigate', url: startingUrl }, { action: 'extract', selector: 'body' }],
      } },
    });
    expect(row?.['details']?.['input']).not.toHaveProperty('url');
    expect(db.tables['agent_tasks']?.[0]?.['waiting_approval_request_id']).toBe(result.approval_request_id);
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('cancels an orphaned approval if task cancellation wins the link race', async () => {
    db.tables['agent_tasks'] = [{
      id: 'task', user_id: 'owner', agent_id: 'agent',
      status: 'waiting_for_tool', cancel_requested: false, waiting_approval_request_id: null,
    }];
    let taskAccesses = 0;
    const racingDb = {
      ...db,
      from: (table: string) => {
        if (table === 'agent_tasks' && ++taskAccesses === 2) {
          db.tables['agent_tasks']![0]!['status'] = 'cancelled';
        }
        return db.from(table);
      },
    };
    await expect(queueBrowserApproval(input, {
      sb: racingDb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedDomains: ['httpbingo.org'],
    } as unknown as Parameters<typeof queueBrowserApproval>[1])).rejects.toThrow(
      'Could not link browser approval to its active task.',
    );
    expect(db.tables['approval_requests']?.at(-1)?.['status']).toBe('cancelled');
    expect(db.tables['agent_tasks']?.[0]?.['waiting_approval_request_id']).toBeNull();
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('fails closed on conflicting starting URLs, unsafe steps, and unsupported budgets', () => {
    const safeSteps = [{ action: 'navigate' }, { action: 'read' }];
    expect(() => approvedBrowserInput({ url: 'https://httpbingo.org/html', steps: [
      { action: 'navigate', url: 'https://other.example/html' }, { action: 'read' },
    ] })).toThrow();
    expect(() => approvedBrowserInput({ steps: safeSteps })).toThrow();
    expect(() => approvedBrowserInput({ url: 'https://httpbingo.org/html?token=x', steps: safeSteps })).toThrow();
    expect(() => approvedBrowserInput({ url: startingUrl, steps: [
      { action: 'navigate' }, { action: 'click', selector: 'button' },
    ] })).toThrow();
    expect(() => approvedBrowserInput({ url: startingUrl, max_steps: 10, steps: safeSteps })).toThrow();
  });
});

describe('bounded approved browser execution', () => {
  it.each(['click', 'type', 'login', 'download'])('refuses %s payloads and credential/profile features', action => {
    expect(() => approvedBrowserInput({ steps: [{ action: 'navigate', url: 'https://httpbingo.org/html' }, { action }] })).toThrow();
    expect(() => approvedBrowserInput({ ...input, persist_session: true })).toThrow();
  });
  it('rejects URLs carrying credentials or query data', () => {
    expect(() => approvedBrowserInput({ steps: [{ action: 'navigate', url: 'https://httpbingo.org/html?token=secret' }, { action: 'read' }] })).toThrow();
  });
  it('rechecks current grants, executes one approved payload and completes the same task with actual evidence', async () => {
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: true, result: { agent_task_id: 'task', simulated: false } });
    expect(calls.execute).toHaveBeenCalledTimes(1);
    expect(calls.execute.mock.calls[0]?.[1]).toEqual(input);
    expect(calls.execute.mock.calls[0]?.[3].get('browser_task')).toMatchObject({ requiresApproval: false, allowedDomains: ['httpbingo.org'] });
    expect(calls.complete).toHaveBeenCalledWith(expect.objectContaining({ run: expect.objectContaining({ taskId: 'task', messages: [expect.objectContaining({ content: expect.stringContaining('Real extracted content') })] }) }));
    expect(db.tables['personal_agents']?.[0]?.['requires_approval']).toBe(true);
  });
  it.each(['pending', 'rejected'])('refuses an approval in %s state', async status => {
    db.tables['approval_requests']![0]!['status'] = status;
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('refuses replay of an already running task', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('refuses cancelled tasks', async () => {
    db.tables['agent_tasks']![0]!['cancel_requested'] = true;
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('refuses revoked tools and changed domains', async () => {
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([['browser_task', { allowedDomains: ['other.example'] }]]) });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('refuses expired approvals and another owner', async () => {
    db.tables['approval_requests']![0]!['expires_at'] = '2020-01-01';
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(await executeApprovedBrowserTask({ ...args(), userId: 'other' })).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('never completes simulated or failed browser results', async () => {
    calls.execute.mockResolvedValueOnce({ ok: true, output: { simulated: true, result: { ok: true } } });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.complete).not.toHaveBeenCalled();
  });
  it('stops before navigation when required audit fails', async () => {
    calls.audit.mockRejectedValueOnce(new Error('audit unavailable'));
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('does not navigate without a matching continuation receipt', async () => {
    db.tables['agent_tasks']![0]!['approval_resume_state'] = null;
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false }); expect(calls.execute).not.toHaveBeenCalled();
  });
  it('resumes planned work through the planner verifier rather than the unplanned executor', async () => {
    db.tables['agent_tasks']![0]!['approval_resume_state'].planner = { plan: { quality_threshold: 0.95, verification_required: true }, toolRounds: 1, reasoningControl: null };
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: true });
    expect(calls.complete).not.toHaveBeenCalled();
    expect(calls.planned).toHaveBeenCalledWith(expect.objectContaining({ resumeCheckpoint: expect.objectContaining({ plan: { quality_threshold: 0.95, verification_required: true } }) }));
  });
  it('closes the associated task when its request is rejected', async () => {
    await rejectBrowserApproval({ ...args(), agentId: 'agent', taskId: 'task' });
    expect(db.tables['agent_tasks']?.[0]?.['status']).toBe('cancelled'); expect(calls.execute).not.toHaveBeenCalled();
  });
});
