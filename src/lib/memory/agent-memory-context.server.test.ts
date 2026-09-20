import { beforeEach, describe, expect, it, vi } from 'vitest';

const recallMemoryFabric = vi.hoisted(() => vi.fn());
const loadMemoryPreferences = vi.hoisted(() => vi.fn());
vi.mock('./memory-fabric.server', () => ({ recallMemoryFabric }));
vi.mock('./preferences.server', () => ({ loadMemoryPreferences }));
import { retrieveGovernedAgentMemory } from './agent-memory-context.server';

const enabled = {
  auto_capture: true, capture_sensitive: false, short_term_enabled: true,
  long_term_enabled: true, document_memory_enabled: true,
  organisation_sharing_enabled: false, short_term_ttl_minutes: 720, retention_days: null,
};
const own = { id: 'owned', title: null, content: 'Owner note', source: 'user',
  memory_type: 'long_term', scope: 'agent', category: 'note', agent_id: 'agent-A',
  org_id: null, expires_at: null, pinned: true };

function database(rows: Record<string, unknown>[], error: unknown = null) {
  const chains: Array<{ filters: Map<string, unknown>; table: string }> = [];
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>();
    chains.push({ table, filters });
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return query }),
      order: vi.fn(() => query),
      limit: vi.fn(async () => ({
        data: rows.filter((row) => [...filters].every(([key, value]) => row[key] === value)),
        error,
      })),
    };
    return query;
  });
  return { from, chains, rpc: vi.fn() };
}

beforeEach(() => {
  vi.resetAllMocks();
  loadMemoryPreferences.mockResolvedValue({ ...enabled });
  recallMemoryFabric.mockResolvedValue([]);
});

describe('agent memory runtime integration', () => {
  it('uses only owner-scoped recent and pinned rows plus governed search', async () => {
    const sb = database([own, { ...own, id: 'stranger', pinned: true }]);
    const result = await retrieveGovernedAgentMemory({ sb: sb as any, userId: 'user-A', agentId: 'agent-A', query: 'project' });
    expect(sb.from).toHaveBeenCalledWith('agent_memories');
    expect(sb.chains.every((chain) => chain.filters.get('user_id') === 'user-A')).toBe(true);
    expect(result.longTerm).toHaveLength(2);
    expect(recallMemoryFabric).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-A', query: 'project', context: { agentId: 'agent-A', orgId: null },
    }));
  });

  it('does not query memory when every recall layer has been disabled', async () => {
    loadMemoryPreferences.mockResolvedValue({ ...enabled, short_term_enabled: false,
      long_term_enabled: false, document_memory_enabled: false, organisation_sharing_enabled: false });
    const sb = database([own]);
    const result = await retrieveGovernedAgentMemory({ sb: sb as any, userId: 'user-A', agentId: 'agent-A', query: 'project' });
    expect(result).toEqual({ shortTerm: [], longTerm: [], organisation: [], documents: [] });
    expect(recallMemoryFabric).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('fails closed when scoped pin retrieval fails', async () => {
    const sb = database([own], { message: 'Permission lookup failed' });
    await expect(retrieveGovernedAgentMemory({ sb: sb as any, userId: 'user-A', agentId: 'agent-A', query: 'project' }))
      .rejects.toThrow('Could not load authorised agent memory.');
  });

  it('does not return memory if the preference lookup fails', async () => {
    loadMemoryPreferences.mockRejectedValue(new Error('preferences unavailable'));
    const sb = database([own]);
    await expect(retrieveGovernedAgentMemory({ sb: sb as any, userId: 'user-A', agentId: 'agent-A', query: 'project' }))
      .rejects.toThrow('preferences unavailable');
    expect(recallMemoryFabric).not.toHaveBeenCalled();
  });
});
