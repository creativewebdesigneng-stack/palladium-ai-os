import { NATIVE_INTELLIGENCE_MIN_EVAL_SCORE, NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES } from '@/lib/ai/native-intelligence-model-platform'

type EvidenceResponse = { id: string; run_id: string; provider: string; model: string }
type EvidenceScore = { run_id: string; response_id: string; score: number | string }

/**
 * Reproduce the database certification RPC's scoring rule on SIGNED,
 * owner-scoped, distinct-case evidence: average the exact candidate's
 * response scores per run, then the normalized run averages.
 * Do not include reference-model responses or unscored claims.
 */
export function inspectAstraVerifiedScoreFloor(args: {
  runIds: readonly string[]
  responses: readonly EvidenceResponse[]
  scores: readonly EvidenceScore[]
  candidateModel: string
}) {
  const perRun: number[] = []
  for (const id of args.runIds) {
    if (!id) return { averageScore: null, qualityFloorMet: false, readyToCertify: false }
    const candidateIds = new Set(args.responses
      .filter((response) => response.run_id === id && response.provider === 'compatible' && response.model === args.candidateModel)
      .map((response) => response.id))
    const values = args.scores
      .filter((score) => score.run_id === id && candidateIds.has(score.response_id))
      .map((score) => Number(score.score))
    if (!values.length || values.length !== candidateIds.size || values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      return { averageScore: null, qualityFloorMet: false, readyToCertify: false }
    }
    perRun.push(values.reduce((sum, value) => sum + value, 0) / values.length)
  }

  if (!perRun.length || new Set(args.runIds).size !== args.runIds.length) {
    return { averageScore: null, qualityFloorMet: false, readyToCertify: false }
  }
  const averageScore = perRun.reduce((sum, value) => sum + value, 0) / (perRun.length * 100)
  const qualityFloorMet = averageScore >= NATIVE_INTELLIGENCE_MIN_EVAL_SCORE
  return {
    averageScore,
    qualityFloorMet,
    readyToCertify: qualityFloorMet && perRun.length >= NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES,
  }
}
