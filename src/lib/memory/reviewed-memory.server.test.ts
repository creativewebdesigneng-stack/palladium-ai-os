import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadMemoryPreferences: vi.fn(),
  expiryFor: vi.fn(),
}));

vi.mock('./preferences.server', () => ({
  loadMemoryPreferences: mocks.loadMemoryPreferences,
  expiryFor: mocks.expiryFor,
}));
vi.mock('./memory.server', () => ({
  MemoryError: class MemoryError extends Error {},
}));

import { promoteReviewedShortTermMemory } from './reviewed-memory.server';

const version = '2026-09-21T22:45:00.000Z';
const owner = 'owner-1';
const memoryId = 'mem-1';
const candidate = {
  id: memoryId,
  user_id: owner,
  content: 'Task: A real user-provided request.\nOutcome: An unverified agent summary.',
  title: 'Previous agent run',
  memory_type: 'short_term',
  scope: 'agent',
  agent_id: 'agent-1',
  org_id: 'org-1',
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  updated_at: version,
  metadata: { provider: 'test-provider', task_id: 'task-1' },
};
const preferences = { long_term_enabled: true, retention_days: 30 };

function fakeDatabase(source = candidate) {
  const updates: Array<Record<string, unknown>> = [];
  const reads: Array<Map<string, unknown>> = [];
  const from = vi.fn((name: string) => {
    expect(name).toBe('agent_memories');
    let filters = new Map<string, unknown>();
    let pending: Record<string, unknown> | null = null;
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((key: string, value: unknown) => {
        filters.set(key, value);
        return chain;
      }),
      update: vi.fn((patch: Record<string, unknown>) => {
        pending = patch;
        updates.push(patch);
        return chain;
      }),
      maybeSingle: vi.fn(async () => {
        reads.push(new Map(filters));
        if (!source || [...filters].some(([key, value]) => (source as Record<string, unknown>)[key] !== value)) {
          return { data: null, error: null };
        }
        if (!pending) return { data: { ...source }, error: null };
        return { data: { ...source, ...pending }, error: null };
      }),
    };
    return chain;
  });
  return { db: { from }, from, updates, reads };
}

function run(sb: { from: (name: string) => any }, patch: Record<string, unknown> = {}) {
  return promoteReviewedShortTermMemory({
    sb, userId: owner, id: memoryId, reviewed: true, expectedUpdatedAt: version, ...patch,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadMemoryPreferences.mockResolvedValue({ ...preferences });
  mocks.expiryFor.mockReturnValue('2026-10-21T22:45:00Z');
});

describe('owner-reviewed long-term memory retention', () => {
  it('retains a reviewed agent memory in place, preserving ownership, agent and scope', async () => {
    const { db, updates, reads } = fakeDatabase();
    const result = await run(db);
    expect(result).toMatchObject({ id: memoryId, memory_type: 'long_term' });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      memory_type: 'long_term',
      expires_at: '2026-10-21T22:45:00Z',
      metadata: {
        provider: 'test-provider',
        task_id: 'task-1',
        promoted_from: 'short_term',
        human_reviewed_retention_at: expect.any(String),
      },
    });
    expect(updates[0]).not.toHaveProperty('scope');
    expect(updates[0]).not.toHaveProperty('agent_id');
    expect(updates[0]).not.toHaveProperty('org_id');
    expect(updates[0]).not.toHaveProperty('content');
    expect(reads).toHaveLength(2);
    for (const filters of reads) {
      expect(filters.get('user_id')).toBe(owner);
      expect(filters.get('id')).toBe(memoryId);
    }
    expect(reads[1]?.get('memory_type')).toBe('short_term');
    expect(reads[1]?.get('updated_at')).toBe(version);
    expect(mocks.expiryFor).toHaveBeenCalledWith('long_term', preferences);
  });

  it('does not write if the user did not explicitly approve or the reviewed version is stale', async () => {
    const { db, updates } = fakeDatabase();
    await expect(run(db, { reviewed: false })).rejects.toThrow('Review the memory');
    await expect(run(db, { expectedUpdatedAt: '2026-09-20T22:45:00Z' })).rejects.toThrow('unavailable or has changed');
    expect(updates).toEqual([]);
  });

  it('blocks organisation-shared, expired or already durable records', async () => {
    for (const altered of [
      { scope: 'shared' },
      { scope: 'organisation' },
      { expires_at: '2020-01-01T00:00:00Z' },
      { expires_at: 'invalid' },
      { memory_type: 'long_term' },
    ]) {
      const { db, updates } = fakeDatabase({ ...candidate, ...altered });
      await expect(run(db)).rejects.toThrow();
      expect(updates).toHaveLength(0);
    }
  });

  it('respects long-term opt-out and fails closed when preferences cannot be loaded', async () => {
    const { db, from, updates } = fakeDatabase();
    mocks.loadMemoryPreferences.mockResolvedValueOnce({ ...preferences, long_term_enabled: false });
    await expect(run(db)).rejects.toThrow('Enable long-term memory');
    mocks.loadMemoryPreferences.mockRejectedValueOnce(new Error('Preference read failed'));
    await expect(run(db)).rejects.toThrow('Preference read failed');
    expect(from).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('fails closed when an agent memory changes between read and write', async () => {
    const db = fakeDatabase();
    // Simulate the update query finding no row because another request changed it.
    const original = db.db.from;
    const wrapped = vi.fn((table: string) => {
      const chain = original(table);
      const originalUpdate = chain.update;
      chain.update = vi.fn((patch: Record<string, unknown>) => {
        originalUpdate(patch);
        chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
        return chain;
      });
      return chain;
    });
    await expect(run({ from: wrapped })).rejects.toThrow('record changed');
  });
});
