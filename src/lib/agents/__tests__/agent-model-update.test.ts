import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ audit: vi.fn(), required: vi.fn(), credentials: vi.fn() }));
vi.mock('@/lib/platform/audit.server', () => ({ writeAudit: state.audit, writeAuditRequired: state.required }));
vi.mock('@/lib/runtime/model-provider-credentials.server', () => ({ listUserModelProviderCredentials: state.credentials }));
import { changeOwnedAgentModel } from '../agent-model-update.server';

const version = '2026-10-17T19:00:00+00:00';
const current = { id: 'agent', model_provider: 'gemini', model: 'gemini-3.6-flash', updated_at: version };
function database(row: unknown = current, updated: unknown = { ...current, model_provider: 'groq', model: 'openai/gpt-oss-20b' }) {
  const filters: unknown[][] = [];
  const patch = vi.fn();
  let writing = false;
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((...args: unknown[]) => { filters.push(args); return chain; }),
    update: vi.fn((payload: unknown) => { patch(payload); writing = true; return chain; }),
    maybeSingle: vi.fn(async () => ({ data: writing ? updated : row, error: null })),
  };
  return { sb: { from: vi.fn(() => chain) }, filters, patch };
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('GROQ_API_KEY', 'synthetic-test'); vi.stubEnv('ANTHROPIC_API_KEY', ''); state.required.mockResolvedValue('audit-id'); state.credentials.mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());
const input = { userId: 'owner', id: 'agent', choice: 'groq-oss-20b', expectedUpdatedAt: version };

describe('owner model changes', () => {
  it('updates only model fields with owner and version filters, after required audit', async () => {
    const db = database();
    await changeOwnedAgentModel({ ...input, sb: db.sb });
    expect(db.patch).toHaveBeenCalledWith({ model_provider: 'groq', model: 'openai/gpt-oss-20b', updated_at: expect.any(String) });
    expect(db.filters.filter(filter => filter[0] === 'user_id')).toEqual([['user_id', 'owner'], ['user_id', 'owner']]);
    expect(db.filters).toContainEqual(['updated_at', version]);
    expect(state.required.mock.invocationCallOrder[0]).toBeLessThan(db.patch.mock.invocationCallOrder[0]!);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.model_changed', metadata: expect.objectContaining({ requestAuditId: 'audit-id' }) }));
  });
  it('does not reveal or modify an agent outside the owner scope', async () => {
    const db = database(null);
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb })).rejects.toThrow('not found');
    expect(db.patch).not.toHaveBeenCalled(); expect(state.required).not.toHaveBeenCalled();
  });
  it('rejects stale UI versions before writing', async () => {
    const db = database();
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb, expectedUpdatedAt: 'older' })).rejects.toThrow('configuration changed');
    expect(db.patch).not.toHaveBeenCalled();
  });
  it('refuses an unconnected provider', async () => {
    const db = database();
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb, choice: 'claude' })).rejects.toThrow('not connected');
    expect(db.patch).not.toHaveBeenCalled();
  });
  it('accepts an enabled owner connection through the existing credential registry', async () => {
    const db = database();
    state.credentials.mockResolvedValue([{ provider: 'anthropic', enabled: true }]);
    await changeOwnedAgentModel({ ...input, sb: db.sb, choice: 'claude' });
    expect(db.patch).toHaveBeenCalledWith(expect.objectContaining({ model_provider: 'anthropic' }));
  });
  it('fails closed if the required request audit cannot be saved', async () => {
    const db = database(); state.required.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb })).rejects.toThrow('audit unavailable');
    expect(db.patch).not.toHaveBeenCalled();
  });
  it('reports a concurrent update instead of claiming a saved change', async () => {
    const db = database(current, null);
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb })).rejects.toThrow('configuration changed');
    expect(state.audit).not.toHaveBeenCalled();
  });
  it.each(['llama', '__proto__', 'invented-model'])('rejects unavailable selection %s', async choice => {
    const db = database();
    await expect(changeOwnedAgentModel({ ...input, sb: db.sb, choice })).rejects.toThrow('supported model');
    expect(db.patch).not.toHaveBeenCalled();
  });
});
