import { describe, expect, it } from 'vitest'
import {
  filterMemoryFabric,
  memoryFabricLayer,
  memoryFabricProvenance,
  memoryFabricAllows,
} from '../memory-fabric'

const memory = (overrides: Record<string, unknown> = {}) => ({
  id: 'memory-1',
  kind: 'memory' as const,
  memory_type: 'long_term',
  scope: 'private',
  ...overrides,
})

describe('Blackstar Memory Fabric governance', () => {
  it('allows private and user memory in personal execution', () => {
    expect(memoryFabricAllows(memory(), { agentId: null, orgId: null })).toBe(true)
    expect(memoryFabricAllows(memory({ scope: 'user' }), { agentId: null, orgId: null })).toBe(true)
  })

  it('does not inject workspace memory into a personal execution', () => {
    expect(memoryFabricAllows(memory({ scope: 'shared' }), { agentId: null, orgId: null })).toBe(false)
    expect(memoryFabricAllows(memory({ scope: 'organisation' }), { agentId: null, orgId: null })).toBe(false)
  })

  it('allows workspace memory only when execution has an organisation boundary', () => {
    expect(memoryFabricAllows(memory({ scope: 'shared' }), { agentId: 'agent-1', orgId: 'org-1' })).toBe(true)
  })

  it('does not inject agent-only memory without an agent boundary', () => {
    expect(memoryFabricAllows(memory({ scope: 'agent' }), { agentId: null })).toBe(false)
    expect(memoryFabricAllows(memory({ scope: 'agent' }), { agentId: 'agent-1' })).toBe(true)
  })

  it('maps existing stores into the four authoritative fabric layers', () => {
    expect(memoryFabricLayer(memory({ memory_type: 'short_term' }))).toBe('short_term')
    expect(memoryFabricLayer(memory({ memory_type: 'organisation' }))).toBe('organisation')
    expect(memoryFabricLayer(memory({ memory_type: 'knowledge' }))).toBe('knowledge')
    expect(memoryFabricLayer({ id: 'chunk-1', kind: 'document', document_id: 'doc-1' })).toBe('knowledge')
    expect(memoryFabricLayer(memory())).toBe('long_term')
  })

  it('keeps explicit provenance without storing hidden model reasoning', () => {
    expect(memoryFabricProvenance({
      id: 'chunk-1', kind: 'document', document_id: 'doc-1', source: 'policy.pdf',
    })).toEqual({ id: 'chunk-1', kind: 'document', documentId: 'doc-1', source: 'policy.pdf' })
  })

  it('filters mixed recall deterministically without changing source ordering', () => {
    const rows = [
      memory({ id: 'private' }),
      memory({ id: 'workspace', scope: 'shared' }),
      memory({ id: 'agent', scope: 'agent' }),
    ]
    expect(filterMemoryFabric(rows, { agentId: null, orgId: null }).map((row) => row.id)).toEqual(['private'])
    expect(filterMemoryFabric(rows, { agentId: 'agent-1', orgId: 'org-1' }).map((row) => row.id)).toEqual([
      'private', 'workspace', 'agent',
    ])
  })
})
