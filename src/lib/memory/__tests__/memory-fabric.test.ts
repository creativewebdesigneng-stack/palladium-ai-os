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
    expect(memoryFabricAllows(memory({ scope: 'shared', org_id: 'org-1' }), { agentId: null, orgId: null })).toBe(false)
    expect(memoryFabricAllows(memory({ scope: 'organisation', org_id: 'org-1' }), { agentId: null, orgId: null })).toBe(false)
  })

  it('allows workspace memory only for the exact organisation boundary', () => {
    const row = memory({ scope: 'shared', org_id: 'org-1' })
    expect(memoryFabricAllows(row, { agentId: 'agent-1', orgId: 'org-1' })).toBe(true)
    expect(memoryFabricAllows(row, { agentId: 'agent-1', orgId: 'org-2' })).toBe(false)
  })

  it('allows agent memory only for the exact agent boundary', () => {
    const row = memory({ scope: 'agent', agent_id: 'agent-1' })
    expect(memoryFabricAllows(row, { agentId: null })).toBe(false)
    expect(memoryFabricAllows(row, { agentId: 'agent-1' })).toBe(true)
    expect(memoryFabricAllows(row, { agentId: 'agent-2' })).toBe(false)
  })

  it('applies the same exact boundary to document knowledge', () => {
    const orgDoc = { id: 'chunk-1', kind: 'document' as const, document_id: 'doc-1', org_id: 'org-1' }
    expect(memoryFabricAllows(orgDoc, { agentId: null, orgId: null })).toBe(false)
    expect(memoryFabricAllows(orgDoc, { agentId: null, orgId: 'org-1' })).toBe(true)
    expect(memoryFabricAllows(orgDoc, { agentId: null, orgId: 'org-2' })).toBe(false)
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
      memory({ id: 'workspace', scope: 'shared', org_id: 'org-1' }),
      memory({ id: 'agent', scope: 'agent', agent_id: 'agent-1' }),
    ]
    expect(filterMemoryFabric(rows, { agentId: null, orgId: null }).map((row) => row.id)).toEqual(['private'])
    expect(filterMemoryFabric(rows, { agentId: 'agent-1', orgId: 'org-1' }).map((row) => row.id)).toEqual([
      'private', 'workspace', 'agent',
    ])
  })
})
