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
import { approvedLocalToolInput, queueLocalToolApproval, approvedBrowserInput, browserApprovalEvidence, queueBrowserApproval, executeApprovedBrowserTask, rejectBrowserApproval } from '../browser-approval.server';
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

  it.each(['browser_task', 'calculator'])('links only one concurrent %s approval and cancels the loser', async name => {
    db.tables['approval_requests'] = [];
    db.tables['agent_tasks'] = [{ id: 'task', user_id: 'owner', agent_id: 'agent',
      status: 'waiting_for_tool', cancel_requested: false, waiting_approval_request_id: null }];
    const ctx = { sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task', allowedDomains: ['httpbingo.org'] } as unknown as Parameters<typeof queueBrowserApproval>[1];
    const queue = () => name === 'browser_task'
      ? queueBrowserApproval(input, ctx)
      : queueLocalToolApproval('calculator', { expression: '6 * 7' }, ctx);
    const results = await Promise.allSettled([queue(), queue()]);
    const winners = results.filter(result => result.status === 'fulfilled');
    expect(winners).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const pending = db.tables['approval_requests']!.filter(row => row['status'] === 'pending');
    const cancelled = db.tables['approval_requests']!.filter(row => row['status'] === 'cancelled');
    expect(pending).toHaveLength(1);
    expect(cancelled).toHaveLength(1);
    expect(db.tables['agent_tasks']![0]!['waiting_approval_request_id']).toBe(pending[0]!['id']);
    if (winners[0]?.status === 'fulfilled') expect(winners[0].value.approval_request_id).toBe(pending[0]!['id']);
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('does not link an old agent approval after concurrent task reassignment', async () => {
    db.tables['approval_requests'] = [];
    db.tables['agent_tasks'] = [{ id: 'task', user_id: 'owner', agent_id: 'agent',
      status: 'waiting_for_tool', cancel_requested: false, waiting_approval_request_id: null }];
    let accesses = 0;
    const racingDb = { ...db, from: (table: string) => {
      if (table === 'agent_tasks' && ++accesses === 2) db.tables['agent_tasks']![0]!['agent_id'] = 'other-agent';
      return db.from(table);
    } };
    await expect(queueBrowserApproval(input, {
      sb: racingDb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task', allowedDomains: ['httpbingo.org'],
    } as unknown as Parameters<typeof queueBrowserApproval>[1])).rejects.toThrow('Could not link browser approval');
    expect(db.tables['agent_tasks']![0]!['waiting_approval_request_id']).toBeNull();
    expect(db.tables['approval_requests']![0]!['status']).toBe('cancelled');
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
  it('retains actual navigation and extraction above the generic ledger limit, with a hard evidence bound', async () => {
    const output = { provider: 'playwright', simulated: false, result: { ok: true, completed_steps: 2, current_url: 'https://httpbingo.org/html', outputs: [{ action: 'navigate', result: { ok: true, status: 200 } }, { action: 'extract', result: { text: 'page text '.repeat(600) } }] } };
    calls.execute.mockResolvedValueOnce({ ok: true, output });
    const receipt = await executeApprovedBrowserTask(args());
    const evidence = receipt.result?.browser_evidence;
    expect(evidence).toMatchObject({ truncated: false, characters: expect.any(Number) });
    expect(JSON.parse(evidence!.content)).toEqual(output);
    expect(browserApprovalEvidence({ text: 'a'.repeat(20_000) })).toMatchObject({ truncated: true, content: expect.any(String) });
    expect(browserApprovalEvidence({ text: 'a'.repeat(20_000) }).content.length).toBe(16_000);
  });
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
  it('does not fail a task another invocation resumed during permission checks', async () => {
    const grants = await calls.resolve();
    calls.resolve.mockImplementationOnce(async () => {
      db.tables['agent_tasks']![0]!['status'] = 'running';
      return grants;
    });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
    expect(db.tables['agent_tasks']![0]!['status']).toBe('running');
  });
  it('does not claim or fail a task reassigned during permission checks', async () => {
    const grants = await calls.resolve();
    calls.resolve.mockImplementationOnce(async () => {
      db.tables['agent_tasks']![0]!['agent_id'] = 'replacement';
      return grants;
    });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
    expect(db.tables['agent_tasks']![0]!['status']).toBe('waiting_for_approval');
  });
  it('persists pre-dispatch permission failure only on the still-bound paused task', async () => {
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map() });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
    expect(db.tables['agent_tasks']![0]!['status']).toBe('failed');
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


describe('bounded local tool approvals share the existing continuation', () => {
  it.each([
    ['calculator', { expression: '12 * 59' }],
    ['current_time', {}],
    ['data_analysis', { values: [2, 4, 8], label: 'sample' }],
    ['web_search', { query: 'football stores UK', limit: 5 }],
    ['memory_search', { query: 'What are the operator project preferences?', category: 'user_preference' }],
    ['file_analysis', { document_id: '75b7069d-0359-4f5f-8aa0-f34e79f0d356' }],
    ['file_analysis', { title: 'Quarterly plan' }],
    ['database_query', { table: 'personal_tasks', limit: 7 }],
    ['calendar', { action: 'list', provider: 'auto' }],
  ])('queues exact %s input without executing it', async (name, input) => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const result = await queueLocalToolApproval(name as string, input, {
      sb: db, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null,
    } as unknown as Parameters<typeof queueLocalToolApproval>[2]);
    expect(result.requires_approval).toBe(true);
    expect(db.tables['approval_requests']?.at(-1)).toMatchObject({
      action_type: 'agent_tool_task', details: { tool: name, input, agent_task_id: 'task' },
    });
    expect(calls.execute).not.toHaveBeenCalled();
  });
  it('queues a shopping comparison only when a retailer domain is explicitly allowed', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const context = {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedDomains: ['shop.example'],
    } as unknown as Parameters<typeof queueLocalToolApproval>[2];
    const req = { requirement: 'replacement bicycle helmet', budget: 75, currency: 'gbp' };
    await expect(queueLocalToolApproval('shopping_search', req, {
      ...context, allowedDomains: [],
    })).rejects.toThrow('outside the current domain policy');
    expect(db.tables['approval_requests']).toHaveLength(1);
    const queued = await queueLocalToolApproval('shopping_search', req, context);
    expect(queued).toMatchObject({ requires_approval: true, status: 'awaiting_approval' });
    expect(db.tables['approval_requests']?.at(-1)).toMatchObject({
      action_type: 'agent_tool_task', details: {
        tool: 'shopping_search', input: {
          requirement: 'replacement bicycle helmet', budget: 75, currency: 'GBP',
        },
      },
    });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('rejects simulated shopping results rather than certifying fake retail offers', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = {
      agent_task_id: 'task', tool: 'shopping_search', input: { requirement: 'bicycle helmet', currency: 'GBP' },
    };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'shopping_search';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['shopping_search', { slug: 'shopping_search', requiresApproval: true, allowedDomains: ['shop.example'], spendCap: 100 }],
    ]) });
    calls.execute.mockResolvedValueOnce({ ok: true, output: {
      provider: 'development', simulated: true, offers: [{ price: 25, title: 'Imaginary listing' }],
    } });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).toHaveBeenCalledTimes(1);
    expect(calls.complete).not.toHaveBeenCalled();
    expect(db.tables['agent_tasks']![0]!['status']).toBe('failed');
  });

  it('refuses shopping research when approved domains were revoked after queueing', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = {
      agent_task_id: 'task', tool: 'shopping_search', input: { requirement: 'helmet' },
    };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'shopping_search';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['shopping_search', { slug: 'shopping_search', requiresApproval: true, allowedDomains: [], spendCap: 100 }],
    ]) });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('queues web_fetch only for explicitly allowed plain HTTPS domains', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const context = {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedDomains: ['httpbingo.org'],
    } as unknown as Parameters<typeof queueLocalToolApproval>[2];
    await expect(queueLocalToolApproval('web_fetch', { url: 'https://other.example/html' }, context))
      .rejects.toThrow('outside the current domain policy');
    expect(db.tables['approval_requests']).toHaveLength(1);
    const queued = await queueLocalToolApproval('web_fetch', { url: 'https://httpbingo.org/html' }, context);
    expect(queued).toMatchObject({ requires_approval: true, status: 'awaiting_approval' });
    expect(db.tables['approval_requests']?.at(-1)).toMatchObject({
      action_type: 'agent_tool_task', details: {
        tool: 'web_fetch', input: { url: 'https://httpbingo.org/html' },
      },
    });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('requires allowed HTTPS domain before queuing a GET-only HTTP request', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const ctx = {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedDomains: ['httpbingo.org'],
    } as unknown as Parameters<typeof queueLocalToolApproval>[2];
    await expect(queueLocalToolApproval('http_request', {
      url: 'https://other.example/path', method: 'GET',
    }, ctx)).rejects.toThrow('outside the current domain policy');
    expect(db.tables['approval_requests']).toHaveLength(1);
    const receipt = await queueLocalToolApproval('http_request', {
      url: 'https://httpbingo.org/html', method: 'GET',
    }, ctx);
    expect(receipt).toMatchObject({ status: 'awaiting_approval', requires_approval: true });
    expect(db.tables['approval_requests']?.at(-1)).toMatchObject({
      action_type: 'agent_tool_task', details: {
        tool: 'http_request', input: { url: 'https://httpbingo.org/html', method: 'GET' },
      },
    });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('fails closed when GET domain permission was revoked before approved execution', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = {
      agent_task_id: 'task', tool: 'http_request',
      input: { url: 'https://httpbingo.org/html', method: 'GET' },
    };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'http_request';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['http_request', { slug: 'http_request', requiresApproval: true, allowedDomains: ['other.example'], spendCap: 0 }],
    ]) });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('rechecks the current web_fetch domain grant before a one-shot approved network request', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = {
      agent_task_id: 'task', tool: 'web_fetch', input: { url: 'https://httpbingo.org/html' },
    };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'web_fetch';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['web_fetch', { slug: 'web_fetch', requiresApproval: true, allowedDomains: ['different.example'], spendCap: 0 }],
    ]) });
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['connected_service', { provider: 'google', action: 'calendar_upcoming', limit: 10 }],
    ['integration_capabilities', { provider: 'google' }],
    ['nango_capabilities', { provider: 'nango_google' }],
  ])('queues owner-assigned read-only %s without making provider calls', async (name, input) => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const result = await queueLocalToolApproval(name, input, {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedProviders: ['google'],
    } as unknown as Parameters<typeof queueLocalToolApproval>[2]);
    expect(result).toMatchObject({ status: 'awaiting_approval', requires_approval: true });
    expect(db.tables['approval_requests']?.at(-1)).toMatchObject({
      action_type: 'agent_tool_task', details: { tool: name },
    });
    expect(db.tables['approval_requests']?.at(-1)?.['details']?.['input'])
      .toEqual(approvedLocalToolInput(name, input));
    expect(db.tables['agent_tasks']?.[0]?.['waiting_approval_request_id']).toBe(result.approval_request_id);
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it('does not queue connected-service or capability approvals for unassigned providers', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const context = {
      sb: db, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task',
      allowedProviders: ['google'],
    } as unknown as Parameters<typeof queueLocalToolApproval>[2];
    for (const [name, input] of [
      ['connected_service', { provider: 'microsoft', action: 'mail_search' }],
      ['integration_capabilities', { provider: 'slack' }],
      ['nango_capabilities', { provider: 'nango_notion' }],
    ] as const) {
      await expect(queueLocalToolApproval(name, input, context))
        .rejects.toThrow('currently assigned connected provider');
    }
    await expect(queueLocalToolApproval('integration_capabilities', {}, {
      ...context, allowedProviders: [],
    })).rejects.toThrow('currently assigned connected provider');
    expect(db.tables['approval_requests']).toHaveLength(1);
    expect(db.tables['agent_tasks']?.[0]?.['waiting_approval_request_id']).toBeNull();
  });

  it.each([
    ['integration_capabilities', {}, { count: 1, capabilities: [{ provider: 'google', action: 'calendar_upcoming' }] }],
    ['connected_service', { provider: 'google', action: 'calendar_upcoming' }, { items: [{ id: 'read-one' }] }],
  ])('executes an already approved %s once with the current assigned provider and unchanged tool policy', async (name, input, output) => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = { agent_task_id: 'task', tool: name, input };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = name;
    db.tables['personal_agents']![0]!['allowed_providers'] = ['google'];
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      [name, { slug: name, requiresApproval: true, allowedDomains: [], spendCap: 0 }],
    ]) });
    calls.execute.mockResolvedValueOnce({ ok: true, output });
    const receipt = await executeApprovedBrowserTask(args());
    expect(receipt).toMatchObject({ ok: true, provider: 'local', result: { agent_task_id: 'task', task_status: 'succeeded' } });
    expect(calls.execute).toHaveBeenCalledTimes(1);
    const call = calls.execute.mock.calls[0]!;
    expect(call[0]).toBe(name);
    expect(call[1]).toEqual(input);
    expect(call[2].allowedProviders).toEqual(['google']);
    expect(call[3].get(name).requiresApproval).toBe(false);
    expect(db.tables['personal_agents']![0]!['requires_approval']).toBe(true);
  });

  it('accepts the observed web-search model limit and canonicalises it to eight before approval', async () => {
    db.tables['agent_tasks']![0]!['status'] = 'running';
    db.tables['agent_tasks']![0]!['waiting_approval_request_id'] = null;
    const result = await queueLocalToolApproval('web_search', { query: 'football stores UK', limit: 10 }, {
      sb: db, userId: 'owner', agentId: 'agent', taskId: 'task', orgId: null,
    } as unknown as Parameters<typeof queueLocalToolApproval>[2]);
    expect(result).toMatchObject({ requires_approval: true, status: 'awaiting_approval' });
    expect(db.tables['approval_requests']?.at(-1)?.['details']?.['input']).toEqual({
      query: 'football stores UK', limit: 8,
    });
    expect(db.tables['agent_tasks']?.[0]?.['waiting_approval_request_id']).toBe(result.approval_request_id);
    expect(calls.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['email_send', {}], ['calculator', { expression: '2^3' }],
    ['calculator', { expression: '1', extra: true }], ['current_time', { url: 'https://example.org' }],
    ['data_analysis', { values: [] }], ['data_analysis', { values: [Infinity] }],
    ['data_analysis', { values: Array(1001).fill(1) }],
    ['web_search', { query: '' }],
    ['web_search', { query: 'ok', url: 'https://internal.local/' }],
    ['web_search', { query: 'ok', limit: -1 }],
    ['web_search', { query: 'q'.repeat(301) }],
    ['shopping_search', { requirement: '' }],
    ['shopping_search', { requirement: 'x'.repeat(301) }],
    ['shopping_search', { requirement: 'helmet', budget: -1 }],
    ['shopping_search', { requirement: 'helmet', budget: Number.POSITIVE_INFINITY }],
    ['shopping_search', { requirement: 'helmet', currency: 'GBP', card_number: 'secret' }],
    ['shopping_search', { requirement: 'helmet', url: 'http://localhost/' }],
    ['memory_search', { query: '' }],
    ['memory_search', { query: 'q'.repeat(301) }],
    ['memory_search', { query: 'ok', user_id: 'other' }],
    ['file_analysis', {}],
    ['file_analysis', { document_id: 'not-an-id' }],
    ['file_analysis', { title: 'q'.repeat(161) }],
    ['file_analysis', { title: 'ok', download: true }],
    ['database_query', { table: 'auth.users' }],
    ['database_query', { table: 'personal_agents', sql: 'select * from auth.users' }],
    ['database_query', { table: 'agent_tasks', limit: 51 }],
    ['database_query', { table: 'agent_tasks', limit: 0 }],
    ['calendar', { action: 'propose', title: 'No implicit event write' }],
    ['calendar', { action: 'list', provider: 'unassigned-app' }],
    ['calendar', { action: 'list', query: 'q'.repeat(201) }],
    ['calendar', { action: 'list', source_user_id: 'another-owner' }],
    ['integration_capabilities', { user_id: 'different-owner' }],
    ['integration_capabilities', { provider: 'bad.provider/path' }],
    ['nango_capabilities', { provider: 'google', permission: 'write' }],
    ['connected_service', { provider: 'google', action: 'calendar_upcoming', access_token: 'secret' }],
    ['connected_service', { provider: 'google', action: 'calendar_upcoming', url: 'https://internal.test' }],
    ['connected_service', { provider: 'google', action: 'calendar_upcoming', limit: 26 }],
    ['connected_service', { provider: 'google', action: 'calendar_upcoming', method: 'POST' }],
    ['http_request', { url: 'http://httpbingo.org/html' }],
    ['http_request', { url: 'https://httpbingo.org/html', method: 'POST' }],
    ['http_request', { url: 'https://httpbingo.org/html', body: '{"delete":true}' }],
    ['http_request', { url: 'https://httpbingo.org/html', headers: { Authorization: 'secret' } }],
    ['http_request', { url: 'https://httpbingo.org/html', method: 'DELETE' }],
    ['web_fetch', { url: 'http://httpbingo.org/html' }],
    ['web_fetch', { url: 'https://httpbingo.org/html?session=private' }],
    ['web_fetch', { url: 'https://user:secret@httpbingo.org/html' }],
    ['web_fetch', { url: 'https://httpbingo.org/html', method: 'POST' }],
  ])('refuses unsupported or unbounded input for %s', (name, input) => {
    expect(() => approvedLocalToolInput(name as string, input)).toThrow();
  });
  it('rechecks the exact current grant, executes once and resumes the same task with original output', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = { agent_task_id: 'task', tool: 'calculator', input: { expression: '12 * 59' } };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'calculator';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['calculator', { requiresApproval: true, allowedDomains: [], spendCap: 0 }],
      ['current_time', { requiresApproval: true, allowedDomains: [], spendCap: 0 }],
    ]) });
    calls.execute.mockResolvedValueOnce({ ok: true, output: { expression: '12 * 59', value: 708 } });
    const result = await executeApprovedBrowserTask(args());
    expect(result).toMatchObject({ ok: true, provider: 'local', result: { agent_task_id: 'task', tool_evidence: { truncated: false } } });
    expect(JSON.parse(result.result!.tool_evidence!.content).value).toBe(708);
    const call = calls.execute.mock.calls[0]!;
    expect(call[0]).toBe('calculator');
    expect(call[1]).toEqual({ expression: '12 * 59' });
    expect(call[3].get('calculator').requiresApproval).toBe(false);
    expect(call[3].get('current_time').requiresApproval).toBe(true);
    expect(calls.complete).toHaveBeenCalledWith(expect.objectContaining({ run: expect.objectContaining({ taskId: 'task', messages: [expect.objectContaining({ content: expect.stringContaining('708') })] }) }));
    expect(db.tables['personal_agents']![0]!['requires_approval']).toBe(true);
  });
  it.each([
    ['memory_search', { query: 'my project', category: 'user_preference' }, { memories: [{ content: 'Preference retained' }] }],
    ['file_analysis', { title: 'Annual report' }, { text: 'Verified document excerpt' }],
  ])('executes approved read-only %s once with current grant and resumes the same task', async (name, input, output) => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = { agent_task_id: 'task', tool: name, input };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = name;
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      [name, { slug: name, requiresApproval: true, allowedDomains: [], spendCap: 0 }],
    ]) });
    calls.execute.mockResolvedValueOnce({ ok: true, output });
    const result = await executeApprovedBrowserTask(args());
    expect(result).toMatchObject({
      ok: true, provider: 'local',
      result: { agent_task_id: 'task', task_status: 'succeeded', tool_evidence: { truncated: false } },
    });
    const call = calls.execute.mock.calls[0]!;
    expect(call[0]).toBe(name);
    expect(call[1]).toEqual(input);
    expect(call[3].get(name).requiresApproval).toBe(false);
    expect(calls.execute).toHaveBeenCalledTimes(1);
    expect(db.tables['personal_agents']![0]!['requires_approval']).toBe(true);
  });

  it('executes an approved bounded database read once and resumes the existing task', async () => {
    const payload = { table: 'personal_agents', limit: 5 };
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = { agent_task_id: 'task', tool: 'database_query', input: payload };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'database_query';
    calls.resolve.mockResolvedValueOnce({ defs: [], grants: new Map([
      ['database_query', { slug: 'database_query', requiresApproval: true, allowedDomains: [], spendCap: null }],
    ]) });
    calls.execute.mockResolvedValueOnce({ ok: true, output: { table: 'personal_agents', rows: [{ id: 'owned', name: 'QA Agent' }] } });
    const output = await executeApprovedBrowserTask(args());
    expect(output).toMatchObject({ ok: true, provider: 'local', result: { agent_task_id: 'task', task_status: 'succeeded' } });
    expect(calls.execute).toHaveBeenCalledTimes(1);
    expect(calls.execute.mock.calls[0]![0]).toBe('database_query');
    expect(calls.execute.mock.calls[0]![1]).toEqual(payload);
    expect(calls.execute.mock.calls[0]![3].get('database_query').requiresApproval).toBe(false);
    expect(db.tables['personal_agents']![0]!['requires_approval']).toBe(true);
  });

  it('does not treat a browser grant as permission for calculator', async () => {
    db.tables['approval_requests']![0]!['action_type'] = 'agent_tool_task';
    db.tables['approval_requests']![0]!['details'] = { agent_task_id: 'task', tool: 'calculator', input: { expression: '1+1' } };
    db.tables['agent_tasks']![0]!['approval_resume_state']['messages'][0]['name'] = 'calculator';
    expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
    expect(calls.execute).not.toHaveBeenCalled();
  });
});

it('fails closed on a malformed approval expiry', async () => {
  db.tables['approval_requests']![0]!['expires_at'] = 'invalid';
  expect(await executeApprovedBrowserTask(args())).toMatchObject({ ok: false });
  expect(calls.execute).not.toHaveBeenCalled();
});
