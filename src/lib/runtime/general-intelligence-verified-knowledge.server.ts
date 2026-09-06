import {
  buildPermissionSafeVerifiedKnowledge,
  type PermissionSafeVerifiedKnowledge,
} from '@/lib/agents/verified-knowledge-transfer'

type Sb = { from: (table: string) => any }

/**
 * Loads only verifier-owned, tenant-scoped metadata that is safe to transfer
 * between explicitly authorised agents. Raw memory content is never selected.
 * Existing caller-scoped RLS remains the primary tenant boundary; the explicit
 * user/org filters below provide defence in depth before sanitisation.
 */
export async function loadPermissionSafeVerifiedKnowledge(args: {
  sb: Sb
  userId: string
  orgId: string | null
  targetAgentId: string
  authorisedSourceAgentIds: Iterable<string>
  limit?: number
}): Promise<PermissionSafeVerifiedKnowledge[]> {
  const authorisedSourceAgentIds = [...new Set(args.authorisedSourceAgentIds)]
    .filter((agentId) => agentId && agentId !== args.targetAgentId)

  if (!authorisedSourceAgentIds.length) return []

  const limit = Math.max(0, Math.min(args.limit ?? 8, 20))
  if (!limit) return []

  let query = args.sb
    .from('agent_memories')
    .select('user_id,org_id,agent_id,task_id,category,source,metadata')
    .eq('user_id', args.userId)
    .eq('category', 'verified_experience')
    .eq('source', 'agent_verifier')
    .in('agent_id', authorisedSourceAgentIds)
    .order('updated_at', { ascending: false })
    .limit(Math.min(limit * 3, 60))

  query = args.orgId === null
    ? query.is('org_id', null)
    : query.eq('org_id', args.orgId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return buildPermissionSafeVerifiedKnowledge({
    rows: data ?? [],
    userId: args.userId,
    orgId: args.orgId,
    targetAgentId: args.targetAgentId,
    authorisedSourceAgentIds,
    limit,
  })
}
