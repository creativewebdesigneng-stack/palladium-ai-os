import { beforeEach, describe, expect, it, vi } from 'vitest'

const searchMemory = vi.hoisted(() => vi.fn())
vi.mock('../memory.server', () => ({ searchMemory }))

import { recallMemoryFabric } from '../memory-fabric.server'

type TableRows = Record<string, Array<Record<string, unknown>>>

function sb(rows: TableRows) {
  return {
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
      const filters = new Map<string, unknown>()
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: unknown) => { filters.set(column, value); return chain }),
        in: vi.fn(async (_column: string, ids: string[]) => ({
          data: (rows[table] ?? []).filter((row) => ids.includes(String(row['id']))
            && [...filters].every(([key, value]) => row[key] === value)),
          error: null,
        })),
      }
      return chain
    }),
  } as any
}

beforeEach(() => vi.clearAllMocks())

describe('recallMemoryFabric', () => {
  it('drops organisation memory when the execution is personal', async () => {
    searchMemory.mockResolvedValue([
      { id: 'private', kind: 'memory', content: 'private fact', similarity: 0.8, scope: 'private' },
      { id: 'shared', kind: 'memory', content: 'workspace fact', similarity: 0.9, scope: 'shared' },
    ])
    const result = await recallMemoryFabric({
      sb: sb({ agent_memories: [
        { id: 'private', user_id: 'user-1', content: 'authoritative private fact', scope: 'private', memory_type: 'long_term', source: 'task', agent_id: null, org_id: null },
        { id: 'shared', user_id: 'user-1', content: 'authoritative shared fact', scope: 'shared', memory_type: 'organisation', source: 'policy', agent_id: null, org_id: 'org-1' },
      ] }),
      userId: 'user-1', query: 'fact', context: { agentId: null, orgId: null },
    })
    expect(result.map((row) => row.id)).toEqual(['private'])
    expect(result[0]).toMatchObject({ layer: 'long_term', provenance: { id: 'private', kind: 'memory', source: 'task' } })
  })

  it('allows exact organisation memory and preserves provenance', async () => {
    searchMemory.mockResolvedValue([
      { id: 'shared', kind: 'memory', content: 'workspace policy', similarity: 0.9, scope: 'shared' },
    ])
    const result = await recallMemoryFabric({
      sb: sb({ agent_memories: [
        { id: 'shared', user_id: 'user-1', content: 'authoritative shared fact', scope: 'shared', memory_type: 'organisation', source: 'handbook', agent_id: null, org_id: 'org-1' },
      ] }),
      userId: 'user-1', query: 'policy', context: { agentId: 'agent-1', orgId: 'org-1' },
    })
    expect(result[0]).toMatchObject({
      id: 'shared', layer: 'organisation', org_id: 'org-1',
      provenance: { id: 'shared', kind: 'memory', source: 'handbook' },
    })
  })

  it('fails closed when search returns a row without authoritative metadata', async () => {
    searchMemory.mockResolvedValue([
      { id: 'ghost', kind: 'memory', content: 'unresolved', similarity: 1, scope: 'private' },
    ])
    const result = await recallMemoryFabric({
      sb: sb({ agent_memories: [] }), userId: 'user-1', query: 'x', context: { agentId: null },
    })
    expect(result).toEqual([])
  })

  it('does not trust vector hits belonging to another user even with a service-role client', async () => {
    searchMemory.mockResolvedValue([
      { id: 'stranger', kind: 'memory', content: 'private record', similarity: 0.99, scope: 'private' },
      { id: 'safe', kind: 'memory', content: 'owned record', similarity: 0.65, scope: 'private' },
    ])
    const result = await recallMemoryFabric({
      sb: sb({ agent_memories: [
        { id: 'stranger', user_id: 'user-2', content: 'private other user data', scope: 'private', memory_type: 'long_term', source: 'note', agent_id: null, org_id: null },
        { id: 'safe', user_id: 'user-1', content: 'safe owned data', scope: 'private', memory_type: 'long_term', source: 'note', agent_id: null, org_id: null },
      ] }),
      userId: 'user-1', query: 'record', context: { agentId: null, orgId: null },
    })
    expect(result.map((row) => row.id)).toEqual(['safe'])
  })

  it('uses owner-checked stored content instead of untrusted vector search payloads', async () => {
    searchMemory.mockResolvedValue([
      { id: 'm', kind: 'memory', content: 'INJECTED CONTENT', similarity: 0.99 },
    ])
    const found = await recallMemoryFabric({ sb: sb({ agent_memories: [
      { id: 'm', user_id: 'user-1', scope: 'private', memory_type: 'long_term', source: 'owner', agent_id: null, org_id: null, content: 'Actual stored content' },
    ] }), userId: 'user-1', query: 'memory', context: { agentId: null, orgId: null } })
    expect(found[0]?.content).toBe('Actual stored content')
  })

  it('rejects knowledge chunks from another user or another document', async () => {
    searchMemory.mockResolvedValue([{ id: 'chunk-1', kind: 'document', document_id: 'doc-1', content: 'INJECTED CONTENT', similarity: 0.95 }])
    const documents = [{ id: 'doc-1', user_id: 'user-1', org_id: null, agent_id: null, title: 'Owned document', metadata: {} }]
    for (const chunk of [
      { id: 'chunk-1', document_id: 'doc-1', user_id: 'user-2', content: 'Other user' },
      { id: 'chunk-1', document_id: 'doc-2', user_id: 'user-1', content: 'Different document' },
    ]) {
      const found = await recallMemoryFabric({ sb: sb({ memory_documents: documents, memory_chunks: [chunk] }),
        userId: 'user-1', query: 'knowledge', context: { agentId: null, orgId: null } })
      expect(found).toEqual([])
    }
  })

  it('checks document organisation metadata before returning knowledge', async () => {
    searchMemory.mockResolvedValue([
      { id: 'chunk-1', kind: 'document', document_id: 'doc-1', content: 'policy', similarity: 0.8 },
    ])
    const database = sb({ memory_documents: [
      { id: 'doc-1', user_id: 'user-1', org_id: 'org-1', agent_id: null, title: 'Policy', metadata: { source: 'policy.pdf' } },
    ], memory_chunks: [
      { id: 'chunk-1', user_id: 'user-1', document_id: 'doc-1', content: 'Authoritative document content' },
    ] })
    const personal = await recallMemoryFabric({
      sb: database, userId: 'user-1', query: 'policy', context: { agentId: null, orgId: null },
    })
    expect(personal).toEqual([])

    const workspace = await recallMemoryFabric({
      sb: database, userId: 'user-1', query: 'policy', context: { agentId: null, orgId: 'org-1' },
    })
    expect(workspace[0]).toMatchObject({
      layer: 'knowledge', provenance: { id: 'chunk-1', kind: 'document', documentId: 'doc-1', source: 'policy.pdf' },
    })
  })
})
