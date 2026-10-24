/**
 * The service-role certification RPC is a persistence boundary, not a hint.
 * Do not return successful attestation if PostgREST returns null, an ambiguous
 * array, a different owner/model/suite, or a malformed score/receipt.
 *
 * This validates the RETURNED row; independent signature and case verification
 * happens upstream and the database migration enforces the last-line gate.
 */
export type AstraRpcEvidenceExpectation = {
  userId: string
  orgId: string | null
  modelId: string
  provider: string
  model: string
  suiteId: string
  taskClass: string
  sampleCount: number
  minimumScore: number
  benchmarkHash: string
  evaluatorHash: string
  modelConfigHash: string
  verifier: string
}

export type AstraValidatedRpcEvidence = {
  id: string
  score: number
  completedAt: string
  verifiedAt: string
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function validateAstraCertificationRpcEvidence(
  value: unknown,
  expected: AstraRpcEvidenceExpectation,
): AstraValidatedRpcEvidence {
  const candidate = Array.isArray(value)
    ? value.length === 1 ? value[0] : null
    : value
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Astra certification RPC returned no unique persisted evidence record.')
  }
  const evidence = candidate as Record<string, unknown>
  if (typeof evidence['id'] !== 'string' || !UUID.test(evidence['id'])) {
    throw new Error('Astra certification RPC returned no valid evidence identifier.')
  }
  const identity: Array<[string, unknown]> = [
    ['user_id', expected.userId],
    ['organization_id', expected.orgId],
    ['model_id', expected.modelId],
    ['provider', expected.provider],
    ['model', expected.model],
    ['suite_id', expected.suiteId],
    ['task_class', expected.taskClass],
    ['benchmark_hash', expected.benchmarkHash],
    ['evaluator_hash', expected.evaluatorHash],
    ['model_config_hash', expected.modelConfigHash],
    ['verifier', expected.verifier],
    ['sample_count', expected.sampleCount],
  ]
  for (const [field, exact] of identity) {
    if (evidence[field] !== exact) {
      throw new Error('Astra certification RPC returned evidence with an unexpected identity or scope.')
    }
  }
  const rawScore = evidence['score']
  if (typeof rawScore !== 'number' && (
    typeof rawScore !== 'string' || !/^[0-9]+(?:\.[0-9]+)?$/.test(rawScore)
  )) {
    throw new Error('Astra certification RPC returned an invalid score.')
  }
  const score = Number(rawScore)
  if (!Number.isFinite(score) || score < expected.minimumScore || score > 1) {
    throw new Error('Astra certification RPC returned evidence below the qualification floor.')
  }
  const completedAt = evidence['completed_at']
  const verifiedAt = evidence['verified_at']
  if (typeof completedAt !== 'string' || !completedAt.trim() ||
      !Number.isFinite(Date.parse(completedAt)) ||
      typeof verifiedAt !== 'string' || !verifiedAt.trim() ||
      !Number.isFinite(Date.parse(verifiedAt))) {
    throw new Error('Astra certification RPC returned incomplete verification timestamps.')
  }
  return { id: evidence['id'], score, completedAt, verifiedAt }
}
