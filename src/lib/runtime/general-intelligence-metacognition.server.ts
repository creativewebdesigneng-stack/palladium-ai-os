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

const STOP_WORDS = new Set([
  'and', 'are', 'but', 'for', 'from', 'have', 'into', 'its', 'not', 'that', 'the', 'their',
  'then', 'this', 'use', 'using', 'was', 'were', 'what', 'when', 'where', 'which', 'with',
  'you', 'your', 'complete', 'create', 'make', 'task', 'work',
])

function objectiveTerms(value: unknown): Set<string> {
  const objective = clean(value, 3000).toLowerCase()
  const terms = objective.match(/[a-z0-9]+/g) ?? []
  return new Set(
    terms
      .map((term) => term.length > 4 && term.endsWith('s') ? term.slice(0, -1) : term)
      .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
  )
}

export function isComparableVerifiedObjective(currentObjective: string, priorObjective: unknown): boolean {
  const current = objectiveTerms(currentObjective)
  const prior = objectiveTerms(priorObjective)
  if (!current.size || !prior.size) return false

  let shared = 0
  for (const term of current) {
    if (prior.has(term)) shared += 1
  }

  const smaller = Math.min(current.size, prior.size)
  return shared >= 2 || (shared >= 1 && shared / smaller >= 0.34)
}

/**
 * Builds a bounded self-evaluation snapshot from verifier-approved long-term
 * experience that is relevant to the current objective. It reuses sanitized
 * metadata, never raw memory content or hidden chain-of-thought. Tenant and
 * verifier provenance are explicit defence in depth in addition to caller RLS.
 */
export async function loadVerifiedExperienceMetacognition(args: {
  sb: Sb
  userId: string
  orgId: string | null
  agentId: string
  objective: string
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
    .limit(Math.min(limit * 3, 36))

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
  let comparableCount = 0

  for (const item of data) {
    if (comparableCount >= limit) break
    const row = item as Record<string, unknown>
    const metadata = row['metadata'] && typeof row['metadata'] === 'object' && !Array.isArray(row['metadata'])
      ? row['metadata'] as Record<string, unknown>
      : {}
    if (metadata['kind'] !== 'verified_experience') continue

    const score = Number(metadata['verification_score'])
    if (!Number.isFinite(score) || score < 0.75 || score > 1) continue
    if (!isComparableVerifiedObjective(args.objective, metadata['objective'])) continue

    comparableCount += 1
    const replans = Number(metadata['replan_count'])
    const completed = Array.isArray(metadata['completed_steps'])
      ? metadata['completed_steps'].map((value) => clean(value, 220)).filter(Boolean)
      : []
    const verifiedEvidence = Array.isArray(metadata['evidence'])
      ? metadata['evidence'].map((value) => clean(value, 300)).filter(Boolean)
      : []

    if (score >= 0.9 && completed.length) strengths.push(...completed)
    if (Number.isFinite(replans) && replans > 0) cautions.push(`A comparable verified run required ${replans} re-plan${replans === 1 ? '' : 's'} before completion.`)
    evidence.push(...verifiedEvidence)
  }

  return {
    version: 1,
    experience_count: comparableCount,
    strengths: unique(strengths, 6),
    cautions: unique(cautions, 6),
    evidence: unique(evidence, 8),
  }
}

export function renderMetacognitionControl(snapshot: MetacognitionSnapshot): string {
  if (snapshot.experience_count === 0) {
    return [
      'BLACKSTAR METACOGNITION CONTROL',
      'No verifier-approved comparable prior experience is available for this agent.',
      'Treat the task as novel, verify important claims and do not infer competence from unrelated or unverified history.',
    ].join('\n')
  }

  return [
    'BLACKSTAR METACOGNITION CONTROL',
    `Verifier-approved comparable prior experiences available: ${snapshot.experience_count}.`,
    `Demonstrated successful execution patterns: ${snapshot.strengths.join(' | ') || 'none extracted'}.`,
    `Known cautions from comparable verified runs: ${snapshot.cautions.join(' | ') || 'none recorded'}.`,
    `Prior verification evidence: ${snapshot.evidence.join(' | ') || 'none extracted'}.`,
    'Use this history as bounded evidence, not as proof that the present task is identical. Re-evaluate assumptions, preserve approval boundaries, and verify the current result independently.',
  ].join('\n')
}
