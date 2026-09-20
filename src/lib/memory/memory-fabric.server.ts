import { searchMemory, type MemorySearchHit, type MemoryType } from './memory.server'
import {
  filterMemoryFabric,
  memoryFabricLayer,
  memoryFabricProvenance,
  type MemoryFabricCandidate,
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
  expires_at: string | null
  title: string | null
  content: string
}

type DocumentAuthorityRow = {
  id: string
  org_id: string | null
  agent_id: string | null
  title: string | null
  metadata: Record<string, unknown> | null
}

type DocumentChunkRow = { id: string; document_id: string; content: string }

type GovernedMemoryHit = MemorySearchHit & MemoryFabricCandidate & {
  source: string | null
  agent_id: string | null
  org_id: string | null
}

export interface MemoryFabricRecallItem extends MemorySearchHit {
  layer: ReturnType<typeof memoryFabricLayer>
  provenance: ReturnType<typeof memoryFabricProvenance>
  agent_id: string | null
  org_id: string | null
  source: string | null
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
    ...(args.includeDocuments === undefined ? {} : { includeDocuments: args.includeDocuments }),
  })

  const memoryIds = hits.filter((hit) => hit.kind === 'memory').map((hit) => hit.id)
  const documentIds = [...new Set(
    hits.filter((hit) => hit.kind === 'document' && hit.document_id).map((hit) => hit.document_id as string),
  )]

  const chunkIds = hits.filter((hit) => hit.kind === 'document').map((hit) => hit.id)

  const [memoryRows, documentRows, chunkRows] = await Promise.all([
    memoryIds.length
      ? args.sb
          .from('agent_memories')
          .select('id,scope,memory_type,source,agent_id,org_id,expires_at,title,content')
          .eq('user_id', args.userId)
          .in('id', memoryIds)
          .then((result: any) => { if (result.error) throw new Error('Could not verify memory access.'); return result.data ?? [] })
      : Promise.resolve([] as MemoryAuthorityRow[]),
    documentIds.length
      ? args.sb
          .from('memory_documents')
          .select('id,org_id,agent_id,title,metadata')
          .eq('user_id', args.userId)
          .in('id', documentIds)
          .then((result: any) => { if (result.error) throw new Error('Could not verify document access.'); return result.data ?? [] })
      : Promise.resolve([] as DocumentAuthorityRow[]),
    chunkIds.length
      ? args.sb
          .from('memory_chunks')
          .select('id,document_id,content')
          .eq('user_id', args.userId)
          .in('id', chunkIds)
          .then((result: any) => { if (result.error) throw new Error('Could not verify knowledge chunk access.'); return result.data ?? [] })
      : Promise.resolve([] as DocumentChunkRow[]),
  ])

  const memoryAuthority = new Map<string, MemoryAuthorityRow>(
    (memoryRows as MemoryAuthorityRow[]).map((row) => [row.id, row]),
  )
  const documentAuthority = new Map<string, DocumentAuthorityRow>(
    (documentRows as DocumentAuthorityRow[]).map((row) => [row.id, row]),
  )
  const chunkAuthority = new Map<string, DocumentChunkRow>(
    (chunkRows as DocumentChunkRow[]).map((row) => [row.id, row]),
  )

  const governed: GovernedMemoryHit[] = []
  for (const hit of hits) {
    if (hit.kind === 'memory') {
      const authority = memoryAuthority.get(hit.id)
      if (!authority) continue
      if (authority.expires_at && (!Number.isFinite(Date.parse(authority.expires_at)) || Date.parse(authority.expires_at) <= Date.now())) continue
      const scope = authority.scope ?? hit.scope
      const memoryType = authority.memory_type ?? hit.memory_type
      governed.push({
        ...hit,
        content: authority.content,
        title: authority.title,
        ...(scope === undefined ? {} : { scope }),
        ...(memoryType === undefined ? {} : { memory_type: memoryType }),
        source: authority.source,
        agent_id: authority.agent_id,
        org_id: authority.org_id,
      })
      continue
    }

    const authority = hit.document_id ? documentAuthority.get(hit.document_id) : undefined
    const chunk = chunkAuthority.get(hit.id)
    if (!authority || !chunk || chunk.document_id !== hit.document_id) continue
    const source = typeof authority.metadata?.['source'] === 'string'
      ? authority.metadata['source'] as string
      : authority.title
    governed.push({
      ...hit,
      content: chunk.content,
      source,
      agent_id: authority.agent_id,
      org_id: authority.org_id,
    })
  }

  return filterMemoryFabric(governed, args.context)
    .slice(0, requestedLimit)
    .map((hit) => ({
      ...hit,
      layer: memoryFabricLayer(hit),
      provenance: memoryFabricProvenance(hit),
    }))
}
