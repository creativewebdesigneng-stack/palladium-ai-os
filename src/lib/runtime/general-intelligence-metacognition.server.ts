type Sb = { from: (table: string) => any }

export type MetacognitionSnapshot = {
  version: 1
  experience_count: number
  strengths: string[]
  cautions: string[]
  evidence: string[]
}

const clean = (value: unknown, max = 700) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''

function unique(values: string[], limit: number) {
  return [...new Set(values.filter(Boolean))].slice(0, limit)
}

/**
 * Builds a bounded self-evaluation snapshot from verifier-approved long-term
 * experience only. It reuses sanitized metadata, never raw memory content or
 * hidden chain-of-thought. Tenant and verifier provenance are explicit defence
 * in depth in addition to caller-scoped RLS.
 */
export async function loadVerifiedExperienceMetacognition(args: {
  sb: Sb
  userId: string
  orgId: string | null
  agentId: string
  limit?: number
}): Promise<MetacognitionSnapshot> {
  const limit = Math.min(Math.max(args.limit ?? 6, 1), 12)
  let query = args.sb
    .from('agent_memories')
    .select('metadata,created_at')
    .eq('user_id', args.userId)
    .eq('agent_id', args.agentId)
    .eq('category', 'verified_experience')
    .eq('source', 'agent_verifier')
    .order('created_at', { ascending: false })
    .limit(limit)

  query = args.orgId === null
    ? query.is('org_id', null)
    : query.eq('org_id', args.orgId)

  const { data, error } = await query
  if (error || !Array.isArray(data) || data.length === 0) {
    return { version: 1, experience_count: 0, strengths: [], cautions: [], evidence: [] }
  }

  const strengths: string[] = []
  const cautions: string[] = []
  const evidence: string[] = []

  for (const item of data) {
    const row = item as Record<string, unknown>
    const metadata = row['metadata'] && typeof row['metadata'] === 'object' && !Array.isArray(row['metadata'])
      ? row['metadata'] as Record<string, unknown>
      : {}
    const score = Number(metadata['verification_score'])
    const replans = Number(metadata['replan_count'])
    const completed = Array.isArray(metadata['completed_steps'])
      ? metadata['completed_steps'].map((value) => clean(value, 220)).filter(Boolean)
      : []
    const verifiedEvidence = Array.isArray(metadata['evidence'])
      ? metadata['evidence'].map((value) => clean(value, 300)).filter(Boolean)
      : []

    if (Number.isFinite(score) && score >= 0.9 && completed.length) strengths.push(...completed)
    if (Number.isFinite(replans) && replans > 0) cautions.push(`A comparable verified run required ${replans} re-plan${replans === 1 ? '' : 's'} before completion.`)
    evidence.push(...verifiedEvidence)
  }

  return {
    version: 1,
    experience_count: data.length,
    strengths: unique(strengths, 6),
    cautions: unique(cautions, 6),
    evidence: unique(evidence, 8),
  }
}

export function renderMetacognitionControl(snapshot: MetacognitionSnapshot): string {
  if (snapshot.experience_count === 0) {
    return [
      'BLACKSTAR METACOGNITION CONTROL',
      'No verifier-approved prior experience is available for this agent.',
      'Treat the task as novel, verify important claims and do not infer competence from unverified history.',
    ].join('\n')
  }

  return [
    'BLACKSTAR METACOGNITION CONTROL',
    `Verifier-approved prior experiences available: ${snapshot.experience_count}.`,
    `Demonstrated successful execution patterns: ${snapshot.strengths.join(' | ') || 'none extracted'}.`,
    `Known cautions from prior verified runs: ${snapshot.cautions.join(' | ') || 'none recorded'}.`,
    `Prior verification evidence: ${snapshot.evidence.join(' | ') || 'none extracted'}.`,
    'Use this history as bounded evidence, not as proof that the present task is identical. Re-evaluate assumptions, preserve approval boundaries, and verify the current result independently.',
  ].join('\n')
}
