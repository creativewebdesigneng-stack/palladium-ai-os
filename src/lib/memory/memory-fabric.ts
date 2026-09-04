export type MemoryFabricLayer = 'short_term' | 'long_term' | 'organisation' | 'knowledge'
export type MemoryFabricScope = 'private' | 'agent' | 'user' | 'shared' | 'organisation'

export interface MemoryFabricContext {
  agentId: string | null
  orgId?: string | null
}

export interface MemoryFabricCandidate {
  id: string
  kind: 'memory' | 'document'
  memory_type?: string
  scope?: string
  document_id?: string | null
  source?: string | null
}

export interface MemoryFabricProvenance {
  id: string
  kind: 'memory' | 'document'
  documentId?: string
  source?: string
}

/**
 * Blackstar Memory Fabric is an execution-time governance layer over the
 * existing RLS-protected Memory/Knowledge stores. Database RLS remains the
 * authority for membership; this policy additionally prevents a personal or
 * agent-only execution from accidentally receiving broader workspace memory.
 */
export function memoryFabricAllows(candidate: MemoryFabricCandidate, context: MemoryFabricContext): boolean {
  if (candidate.kind === 'document') return true

  const scope = (candidate.scope ?? 'private') as MemoryFabricScope
  if (scope === 'shared' || scope === 'organisation') return Boolean(context.orgId)
  if (scope === 'agent') return Boolean(context.agentId)
  return scope === 'private' || scope === 'user'
}

export function memoryFabricLayer(candidate: MemoryFabricCandidate): MemoryFabricLayer {
  if (candidate.kind === 'document') return 'knowledge'
  if (candidate.memory_type === 'short_term') return 'short_term'
  if (
    candidate.memory_type === 'organisation' ||
    candidate.scope === 'shared' ||
    candidate.scope === 'organisation'
  ) return 'organisation'
  if (candidate.memory_type === 'knowledge') return 'knowledge'
  return 'long_term'
}

export function memoryFabricProvenance(candidate: MemoryFabricCandidate): MemoryFabricProvenance {
  return {
    id: candidate.id,
    kind: candidate.kind,
    ...(candidate.document_id ? { documentId: candidate.document_id } : {}),
    ...(candidate.source ? { source: candidate.source } : {}),
  }
}

export function filterMemoryFabric<T extends MemoryFabricCandidate>(
  candidates: T[],
  context: MemoryFabricContext,
): T[] {
  return candidates.filter((candidate) => memoryFabricAllows(candidate, context))
}
