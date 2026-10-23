import { describe, expect, it } from 'vitest'
import { NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES, NATIVE_INTELLIGENCE_MIN_EVAL_SCORE } from '@/lib/ai/native-intelligence-model-platform'
import { inspectAstraVerifiedScoreFloor } from './astra-certification-quality-floor'

const ids = Array.from({ length: NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES }, (_, i) => 'run-' + i)
const responses = ids.map((run_id) => ({ id: 'response-' + run_id, run_id, provider: 'compatible', model: 'astra' }))
const scores = ids.map((run_id) => ({ run_id, response_id: 'response-' + run_id, score: 80 }))

describe('Astra certified-quality floor', () => {
  it('requires both the existing exact run count and the original native intelligence score floor', () => {
    expect(NATIVE_INTELLIGENCE_MIN_EVAL_SCORE).toBe(0.75)
    expect(inspectAstraVerifiedScoreFloor({ runIds: ids, responses, scores, candidateModel: 'astra' }))
      .toMatchObject({ qualityFloorMet: true, readyToCertify: true, averageScore: 0.8 })
    expect(inspectAstraVerifiedScoreFloor({ runIds: ids.slice(0, 19), responses, scores, candidateModel: 'astra' }))
      .toMatchObject({ qualityFloorMet: true, readyToCertify: false })
  })

  it('rejects 20 legitimately completed but low-scoring runs', () => {
    const weak = scores.map((item) => ({ ...item, score: 40 }))
    expect(inspectAstraVerifiedScoreFloor({ runIds: ids, responses, scores: weak, candidateModel: 'astra' }))
      .toMatchObject({ averageScore: 0.4, readyToCertify: false, qualityFloorMet: false })
  })

  it('scores only the current candidate even if unrelated comparison scores are high', () => {
    const extra = ids.map((run_id) => ({ id: 'other-' + run_id, run_id, provider: 'openai', model: 'reference' }))
    const extraScores = ids.map((run_id) => ({ run_id, response_id: 'other-' + run_id, score: 100 }))
    const result = inspectAstraVerifiedScoreFloor({ runIds: ids, responses: [...responses, ...extra],
      scores: [...scores.map(x => ({ ...x, score: 50 })), ...extraScores], candidateModel: 'astra' })
    expect(result).toMatchObject({ averageScore: 0.5, qualityFloorMet: false, readyToCertify: false })
  })

  it('rejects duplicated cases, missing scores, invalid values and missing matching responses', () => {
    const args = { runIds: ids, responses, scores, candidateModel: 'astra' }
    expect(inspectAstraVerifiedScoreFloor({ ...args, runIds: [...ids.slice(1), ids[1]!] }).readyToCertify).toBe(false)
    expect(inspectAstraVerifiedScoreFloor({ ...args, scores: scores.slice(1) }).readyToCertify).toBe(false)
    expect(inspectAstraVerifiedScoreFloor({ ...args, scores: scores.map((x, i) => i === 0 ? { ...x, score: Number.NaN } : x) }).readyToCertify).toBe(false)
    expect(inspectAstraVerifiedScoreFloor({ ...args, candidateModel: 'unrelated' }).readyToCertify).toBe(false)
  })
})
