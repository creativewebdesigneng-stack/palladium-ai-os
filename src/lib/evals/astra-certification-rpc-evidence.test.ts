import { describe, expect, it } from 'vitest'
import { validateAstraCertificationRpcEvidence } from './astra-certification-rpc-evidence'

const expected = {
  userId: '11111111-1111-4111-8111-111111111111',
  orgId: '22222222-2222-4222-8222-222222222222',
  modelId: 'blackstar-astra-v0.1',
  provider: 'compatible',
  model: 'pinned-native-candidate',
  suiteId: 'blackstar-astra-reasoning-certification-v2',
  taskClass: 'reasoning',
  sampleCount: 20,
  minimumScore: 0.75,
  benchmarkHash: 'a'.repeat(64),
  evaluatorHash: 'b'.repeat(64),
  modelConfigHash: 'c'.repeat(64),
  verifier: 'blackstar-native-intelligence-verifier-v4',
}
const good = {
  id: '33333333-3333-4333-8333-333333333333',
  user_id: expected.userId,
  organization_id: expected.orgId,
  model_id: expected.modelId,
  provider: expected.provider,
  model: expected.model,
  suite_id: expected.suiteId,
  task_class: expected.taskClass,
  sample_count: expected.sampleCount,
  score: '0.85000000',
  benchmark_hash: expected.benchmarkHash,
  evaluator_hash: expected.evaluatorHash,
  model_config_hash: expected.modelConfigHash,
  verifier: expected.verifier,
  completed_at: '2026-10-23T15:00:00Z',
  verified_at: '2026-10-23T15:01:00Z',
}

describe('Astra certification must be backed by an exact returned database receipt', () => {
  it('accepts a complete exact owner/model/suite record including numeric text', () => {
    const result = validateAstraCertificationRpcEvidence(good, expected)
    expect(result).toEqual({
      id: good.id, score: 0.85,
      completedAt: good.completed_at, verifiedAt: good.verified_at,
    })
    expect(validateAstraCertificationRpcEvidence([good], expected)).toEqual(result)
    expect(validateAstraCertificationRpcEvidence(
      { ...good, organization_id: null }, { ...expected, orgId: null },
    ).id).toBe(good.id)
    expect(validateAstraCertificationRpcEvidence(
      { ...good, score: 0.75 }, expected,
    ).score).toBe(0.75)
  })

  it('fails closed on absent, empty, malformed, or ambiguous persisted evidence', () => {
    for (const invalid of [
      null, undefined, [], [good, good], {},
      { ...good, id: null }, { ...good, id: 'fake-id' },
      { ...good, completed_at: null },
      { ...good, verified_at: 'not-a-date' },
    ]) {
      expect(() => validateAstraCertificationRpcEvidence(invalid, expected)).toThrow(/certification RPC/)
    }
  })

  it('rejects evidence from another user, workspace, model, suite, or batch', () => {
    for (const [column, value] of [
      ['user_id', 'another-user'],
      ['organization_id', 'another-workspace'],
      ['organization_id', null],
      ['model_id', 'ordinary-native-model'],
      ['provider', 'groq'],
      ['model', 'substituted-model'],
      ['suite_id', 'stale-v1-suite'],
      ['task_class', 'coding'],
      ['sample_count', 19],
      ['benchmark_hash', 'd'.repeat(64)],
      ['evaluator_hash', 'd'.repeat(64)],
      ['model_config_hash', 'd'.repeat(64)],
      ['verifier', 'unapproved-verifier'],
    ] as const) {
      expect(() => validateAstraCertificationRpcEvidence({ ...good, [column]: value }, expected))
        .toThrow(/unexpected identity or scope/)
    }
  })

  it('rejects missing, invalid, or below-floor scores', () => {
    for (const score of [
      null, '', 'NaN', '0.74', 0.74, '1.01', 1.01,
      -1, Number.POSITIVE_INFINITY, ' 0.8', 'eighty',
    ]) {
      expect(() => validateAstraCertificationRpcEvidence({ ...good, score }, expected))
        .toThrow(/score|floor/)
    }
  })
})
