import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';

const connected = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: createFakeSupabase() }));
vi.mock('@/lib/integrations/connected-service.server', () => ({
  readConnectedService: connected.read,
  CONNECTED_SERVICE_ACTIONS: {},
}));
import { executeTool } from '../tools.server';

const seed = () => createFakeSupabase({
  tool_executions: [],
  personal_tasks: [
    { id: 'mine', user_id: 'owner', title: 'Own appointment', status: 'pending', due_at: '2026-11-02T10:00:00Z' },
    { id: 'foreign', user_id: 'other', title: 'Other user appointment', status: 'pending', due_at: '2026-11-02T11:00:00Z' },
  ],
});
function dbWithNot() {
  const db = seed();
  // The local Supabase test double does not implement the PostgREST null
  // predicate; preserve the real owner filter while supplying that method.
  const from = db.from.bind(db);
  db.from = ((table: string) => {
    const query = from(table);
    if (table === 'personal_tasks') query.not = () => query;
    return query;
  }) as typeof db.from;
  return db;
}
function run(allowedProviders: string[], input: Record<string, unknown> = { action: 'list', provider: 'auto' }) {
  const db = dbWithNot();
  return executeTool('calendar', input, {
    sb: db, userId: 'owner', orgId: null, agentId: 'agent',
    taskId: 'task', allowedProviders,
  }, new Map([['calendar', {
    slug: 'calendar', requiresApproval: false, allowedDomains: [], spendCap: null,
  }]])).then(result => ({ result, db }));
}

describe('agent calendar connector assignment and truthful readiness', () => {
  beforeEach(() => connected.read.mockReset());

  it('uses only the agent-assigned Google calendar, never an unassigned Microsoft connection', async () => {
    connected.read.mockResolvedValue({ events: [{ title: 'Connected event' }] });
    const { result } = await run(['google']);
    expect(result).toMatchObject({ ok: true, output: { source: 'google', connected: true } });
    expect(connected.read).toHaveBeenCalledTimes(1);
    expect(connected.read.mock.calls[0]![1]).toMatchObject({ provider: 'google', action: 'calendar_upcoming' });
  });

  it('does not call any external calendar when none is assigned and reads only own tasks', async () => {
    const { result } = await run([]);
    expect(result).toMatchObject({ ok: true, output: {
      source: 'palladium', connected: false,
      events: [{ id: 'mine', title: 'Own appointment' }],
    } });
    expect(JSON.stringify(result.output)).not.toContain('Other user appointment');
    expect(connected.read).not.toHaveBeenCalled();
  });

  it('falls back without fabricating a connected result when a provider returns null', async () => {
    connected.read.mockResolvedValue(null);
    const { result } = await run(['google']);
    expect(result).toMatchObject({ ok: true, output: { source: 'palladium', connected: false } });
  });

  it('does not query explicitly requested but unassigned Microsoft provider', async () => {
    connected.read.mockResolvedValue({ events: [{ title: 'Private Microsoft event' }] });
    const { result } = await run(['google'], { action: 'list', provider: 'microsoft' });
    expect(result).toMatchObject({ ok: true, output: { source: 'palladium', connected: false } });
    expect(connected.read).not.toHaveBeenCalled();
  });
});
