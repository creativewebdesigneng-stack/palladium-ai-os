import { expiryFor, loadMemoryPreferences } from './preferences.server';
import { MemoryError } from './memory.server';

type Sb = { from: (table: string) => any };

type ReviewCandidate = {
  id: string;
  user_id: string;
  content: string;
  title: string | null;
  scope: string;
  memory_type: string;
  expires_at: string | null;
  agent_id: string | null;
  org_id: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

/**
 * A human may retain an EXISTING, reviewed short-term memory beyond its
 * original TTL. Never silently promote an agent's generated outcome to a
 * durable fact or copy it into a second memory store.
 *
 * Keep the same owner, agent, organisation and scope. The owner's retention
 * policy controls the new expiry, and the source still remains an unverified
 * historical record unless separately corroborated.
 */
export async function promoteReviewedShortTermMemory(args: {
  sb: Sb;
  userId: string;
  id: string;
  reviewed: boolean;
}) {
  if (!args.reviewed) throw new MemoryError('Review the memory and confirm that you wish to keep it for longer.');
  const preferences = await loadMemoryPreferences(args.sb, args.userId);
  if (!preferences.long_term_enabled) {
    throw new MemoryError('Enable long-term memory in Memory settings before retaining this record.');
  }

  const { data: row, error: readError } = await args.sb.from('agent_memories')
    .select('id,user_id,content,title,scope,memory_type,expires_at,agent_id,org_id,metadata,updated_at')
    .eq('id', args.id)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (readError) throw new MemoryError('Could not review that memory. Try again.');
  const candidate = row as ReviewCandidate | null;
  if (!candidate || candidate.memory_type !== 'short_term') {
    throw new MemoryError('The selected short-term memory is unavailable or has changed.');
  }
  // Explicit organisation sharing has its own approval controls. Reviewing an
  // agent-private memory must never turn it into workspace-shared knowledge.
  if (!['private', 'agent', 'user'].includes(candidate.scope)) {
    throw new MemoryError('Shared organisation memories require separate approval.');
  }
  if (!candidate.content?.trim() || !candidate.updated_at) {
    throw new MemoryError('This memory cannot be reviewed in its current state.');
  }
  if (candidate.expires_at) {
    const expiresAt = Date.parse(candidate.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new MemoryError('This short-term memory has expired. Save a new reviewed memory instead.');
    }
  }
  // This is evidence of a user retention choice, NOT verification of truth.
  // An optimistic concurrency guard prevents promoting stale contents that
  // another request edited between the user reading and confirming them.
  const reviewedAt = new Date().toISOString();
  const { data: stored, error: writeError } = await args.sb.from('agent_memories')
    .update({
      memory_type: 'long_term',
      expires_at: expiryFor('long_term', preferences),
      metadata: {
        ...(candidate.metadata ?? {}),
        human_reviewed_retention_at: reviewedAt,
        promoted_from: 'short_term',
      },
    })
    .eq('id', candidate.id)
    .eq('user_id', args.userId)
    .eq('memory_type', 'short_term')
    .eq('updated_at', candidate.updated_at)
    .select('id,memory_type,scope,agent_id,org_id,expires_at,updated_at')
    .maybeSingle();
  if (writeError || !stored) {
    throw new MemoryError('The record changed or could not be retained. Refresh and review it again.');
  }
  return {
    id: stored.id as string,
    memory_type: 'long_term' as const,
    expires_at: stored.expires_at as string | null,
  };
}
