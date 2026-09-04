import { beforeEach, describe, expect, it, vi } from 'vitest'

const searchMemory = vi.hoisted(() => vi.fn())
vi.mock('../memory.server', () => ({ searchMemory }))

import { recallMemoryFabric } from '../memory-fabric.server'

type TableRows = Record<string, Array<Record<string, unknown>>>

function sb(rows: TableRows) {
  return {
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        in: vi.fn(async (_column: string, ids: string[]) => ({
          data: (rows[table] ?? []).filter((row) => ids.includes(String(row.id))),
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
        { id: 'private', scope: 'private', memory_type: 'long_term', source: 'task', agent_id: null, org_id: null },
        { id: 'shared', scope: 'shared', memory_type: 'organisation', source: 'policy', agent_id: null, org_id: 'org-1' },
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
        { id: 'shared', scope: 'shared', memory_type: 'organisation', source: 'handbook', agent_id: null, org_id: 'org-1' },
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

  it('checks document organisation metadata before returning knowledge', async () => {
    searchMemory.mockResolvedValue([
      { id: 'chunk-1', kind: 'document', document_id: 'doc-1', content: 'policy', similarity: 0.8 },
    ])
    const database = sb({ memory_documents: [
      { id: 'doc-1', org_id: 'org-1', agent_id: null, title: 'Policy', metadata: { source: 'policy.pdf' } },
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
