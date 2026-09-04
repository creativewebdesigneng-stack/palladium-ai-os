import { searchMemory, type MemorySearchHit, type MemoryType } from './memory.server'
import {
  filterMemoryFabric,
  memoryFabricLayer,
  memoryFabricProvenance,
  type MemoryFabricContext,
} from './memory-fabric'

type Sb = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any }

type MemoryAuthorityRow = {
  id: string
  scope: string | null
  memory_type: string | null
  source: string | null
  agent_id: string | null
  org_id: string | null
}

type DocumentAuthorityRow = {
  id: string
  org_id: string | null
  agent_id: string | null
  title: string | null
  metadata: Record<string, unknown> | null
}

export interface MemoryFabricRecallItem extends MemorySearchHit {
  layer: ReturnType<typeof memoryFabricLayer>
  provenance: ReturnType<typeof memoryFabricProvenance>
  agent_id?: string | null
  org_id?: string | null
  source?: string | null
}

export async function recallMemoryFabric(args: {
  sb: Sb
  userId: string
  query: string
  context: MemoryFabricContext
  limit?: number
  types?: MemoryType[] | null
  includeDocuments?: boolean
}): Promise<MemoryFabricRecallItem[]> {
  const requestedLimit = Math.min(Math.max(args.limit ?? 8, 1), 25)
  const hits = await searchMemory({
    sb: args.sb,
    userId: args.userId,
    query: args.query,
    limit: requestedLimit,
    agentId: args.context.agentId,
    types: args.types ?? null,
    includeDocuments: args.includeDocuments,
  })

  const memoryIds = hits.filter((hit) => hit.kind === 'memory').map((hit) => hit.id)
  const documentIds = [...new Set(
    hits.filter((hit) => hit.kind === 'document' && hit.document_id).map((hit) => hit.document_id as string),
  )]

  const [memoryRows, documentRows] = await Promise.all([
    memoryIds.length
      ? args.sb
          .from('agent_memories')
          .select('id,scope,memory_type,source,agent_id,org_id')
          .in('id', memoryIds)
          .then((result: any) => result.data ?? [])
      : Promise.resolve([] as MemoryAuthorityRow[]),
    documentIds.length
      ? args.sb
          .from('memory_documents')
          .select('id,org_id,agent_id,title,metadata')
          .in('id', documentIds)
          .then((result: any) => result.data ?? [])
      : Promise.resolve([] as DocumentAuthorityRow[]),
  ])

  const memoryAuthority = new Map<string, MemoryAuthorityRow>(
    (memoryRows as MemoryAuthorityRow[]).map((row) => [row.id, row]),
  )
  const documentAuthority = new Map<string, DocumentAuthorityRow>(
    (documentRows as DocumentAuthorityRow[]).map((row) => [row.id, row]),
  )

  const governed = hits.flatMap((hit) => {
    if (hit.kind === 'memory') {
      const authority = memoryAuthority.get(hit.id)
      if (!authority) return []
      return [{
        ...hit,
        scope: authority.scope ?? hit.scope,
        memory_type: authority.memory_type ?? hit.memory_type,
        source: authority.source,
        agent_id: authority.agent_id,
        org_id: authority.org_id,
      }]
    }

    const authority = hit.document_id ? documentAuthority.get(hit.document_id) : undefined
    if (!authority) return []
    const source = typeof authority.metadata?.['source'] === 'string'
      ? authority.metadata['source'] as string
      : authority.title
    return [{
      ...hit,
      source,
      agent_id: authority.agent_id,
      org_id: authority.org_id,
    }]
  })

  return filterMemoryFabric(governed, args.context)
    .slice(0, requestedLimit)
    .map((hit) => ({
      ...hit,
      layer: memoryFabricLayer(hit),
      provenance: memoryFabricProvenance(hit),
    }))
}
