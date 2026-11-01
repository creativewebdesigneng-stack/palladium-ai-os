import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  getVectorStore: vi.fn(),
  embedOne: vi.fn(),
}));

vi.mock('../vector-store.server', () => ({
  getVectorStore: mocked.getVectorStore,
  resolveVectorProvider: () => 'pgvector',
}));
vi.mock('../embeddings.server', () => ({
  embedOne: mocked.embedOne,
  embedTexts: vi.fn(),
  EmbeddingError: class EmbeddingError extends Error {},
}));

import { deleteMemory, indexMemory, updateMemory } from '../memory.server';

beforeEach(() => {
  vi.clearAllMocks();
  mocked.getVectorStore.mockReturnValue({
    remove: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue({ externalIds: {} }),
  });
});

function memoryRead(user_id: string) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: { id: 'shared-record', user_id, org_id: 'org-a', agent_id: null,
        content: 'Restricted knowledge', vector_provider: 'pgvector' },
      error: null,
    })),
    delete: vi.fn(() => chain),
    update: vi.fn(() => chain),
  };
  return { chain, sb: { from: vi.fn(() => chain), rpc: vi.fn() } } as const;
}

describe('Owner-only vector and memory mutation boundary', () => {
  it('rejects non-owner memory deletion without vector or DB delete side effects', async () => {
    const { chain, sb } = memoryRead('different-user');
    await expect(deleteMemory({
      sb: sb as any, userId: 'requesting-user', id: 'shared-record',
    })).rejects.toThrow('do not own');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'requesting-user');
    expect(mocked.getVectorStore).not.toHaveBeenCalled();
    expect(chain.delete).not.toHaveBeenCalled();
  });

  it('rejects foreign memory before invoking embeddings or vector store', async () => {
    const { sb } = memoryRead('different-user');
    await expect(indexMemory({
      sb: sb as any, userId: 'requesting-user',
      memory: { id: 'shared-record', user_id: 'different-user', content: 'Sensitive source' },
    })).rejects.toThrow('do not own');
    expect(mocked.embedOne).not.toHaveBeenCalled();
    expect(mocked.getVectorStore).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('rejects a non-owner update response before any reindex', async () => {
    const { chain, sb } = memoryRead('different-user');
    await expect(updateMemory({
      sb: sb as any, userId: 'requesting-user', id: 'shared-record',
      patch: { content: 'unauthorised edit' },
    })).rejects.toThrow('do not own');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'requesting-user');
    expect(mocked.getVectorStore).not.toHaveBeenCalled();
    expect(mocked.embedOne).not.toHaveBeenCalled();
  });

  it('does not return a fabricated delete-success when zero rows were deleted', async () => {
    const read = memoryRead('requesting-user').chain;
    const removal: any = { delete: vi.fn(() => removal), eq: vi.fn(() => removal),
      select: vi.fn(async () => ({ data: [], error: null })) };
    const sb = { from: vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(removal), rpc: vi.fn() };
    await expect(deleteMemory({
      sb: sb as any, userId: 'requesting-user', id: 'shared-record',
    })).rejects.toThrow('not deleted');
    expect(mocked.getVectorStore).toHaveBeenCalledTimes(1);
    expect(removal.eq).toHaveBeenCalledWith('user_id', 'requesting-user');
  });
});
