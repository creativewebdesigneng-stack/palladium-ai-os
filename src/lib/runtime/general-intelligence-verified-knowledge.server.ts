import {
  buildPermissionSafeVerifiedKnowledge,
  type PermissionSafeVerifiedKnowledge,
} from '@/lib/agents/verified-knowledge-transfer'
import { isComparableVerifiedObjective } from './general-intelligence-metacognition.server'

type Sb = { from: (table: string) => any }

/**
 * Loads only verifier-owned, tenant-scoped metadata that is safe and relevant
 * to transfer between explicitly authorised agents. Raw memory content is never
 * selected. Existing caller-scoped RLS remains the primary tenant boundary;
 * explicit user/org/source/relevance filters provide defence in depth.
 */
export async function loadPermissionSafeVerifiedKnowledge(args: {
  sb: Sb
  userId: string
  orgId: string | null
  targetAgentId: string
  objective: string
  authorisedSourceAgentIds: Iterable<string>
  limit?: number
}): Promise<PermissionSafeVerifiedKnowledge[]> {
  const authorisedSourceAgentIds = [...new Set(args.authorisedSourceAgentIds)]
    .filter((agentId) => agentId && agentId !== args.targetAgentId)

  if (!authorisedSourceAgentIds.length) return []

  const limit = Math.max(0, Math.min(args.limit ?? 8, 20))
  if (!limit) return []

  const queryLimit = Math.min(limit * 3, 60)
  let query = args.sb
    .from('agent_memories')
    .select('user_id,org_id,agent_id,task_id,category,source,metadata')
    .eq('user_id', args.userId)
    .eq('category', 'verified_experience')
    .eq('source', 'agent_verifier')
    .in('agent_id', authorisedSourceAgentIds)
    .order('updated_at', { ascending: false })
    .limit(queryLimit)

  query = args.orgId === null
    ? query.is('org_id', null)
    : query.eq('org_id', args.orgId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const safe = buildPermissionSafeVerifiedKnowledge({
    rows: data ?? [],
    userId: args.userId,
    orgId: args.orgId,
    targetAgentId: args.targetAgentId,
    authorisedSourceAgentIds,
    limit: queryLimit,
  })

  return safe
    .filter((entry) => isComparableVerifiedObjective(args.objective, entry.objective))
    .slice(0, limit)
}
