/**
 * Durable evaluation evidence must form a one-to-one relation between the
 * exact run's responses and independent judge score records. Equal row counts
 * alone allow duplicate, missing and cross-run score references.
 */
export type AstraEvidenceResponseLink = {
  id: string
  run_id: string
  provider: string
  model: string
}
export type AstraEvidenceScoreLink = {
  run_id: string
  response_id: string
  evaluator_type: string
  score: number | string
  criteria: unknown
}

export function hasLinkedAstraEvaluationEvidence(args: {
  runId: string
  responses: readonly AstraEvidenceResponseLink[]
  scores: readonly AstraEvidenceScoreLink[]
  judgeProvider: string | null
  judgeModel: string | null
  expectedCriteria: readonly string[]
}): boolean {
  if (!args.runId || !args.judgeProvider || !args.judgeModel ||
    args.responses.length === 0 || args.responses.length !== args.scores.length) return false

  const ids = new Set<string>()
  for (const response of args.responses) {
    if (!response.id || ids.has(response.id) || response.run_id !== args.runId ||
      !response.provider || !response.model) return false
    ids.add(response.id)
  }

  const scored = new Set<string>()
  for (const score of args.scores) {
    if (score.run_id !== args.runId || !ids.has(score.response_id) ||
      scored.has(score.response_id) || score.evaluator_type !== 'llm_judge') return false
    scored.add(score.response_id)
    // PostgreSQL numeric values can be serialized as strings; never accept
    // empty/whitespace/NaN/Infinity or scores outside the defined range.
    if (typeof score.score !== 'number' && (typeof score.score !== 'string' ||
      !/^\d+(?:\.\d+)?$/.test(score.score.trim()))) return false
    const numeric = Number(score.score)
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return false

    const criteria = score.criteria
    if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) return false
    const record = criteria as Record<string, unknown>
    if (record['judgeProvider'] !== args.judgeProvider ||
      record['judgeModel'] !== args.judgeModel) return false
    const names = record['names']
    if (!Array.isArray(names) || names.length !== args.expectedCriteria.length ||
      !names.every((name, i) => name === args.expectedCriteria[i])) return false
  }
  return scored.size === ids.size
}
