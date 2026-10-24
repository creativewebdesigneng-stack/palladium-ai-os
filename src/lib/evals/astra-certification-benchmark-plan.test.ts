import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ verifiedCases: vi.fn(), from: vi.fn() }))
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('@/lib/evals/astra-evaluation-verifier.server', () => ({
  listVerifiedAstraEvaluationCaseIds: mocks.verifiedCases,
  hashAstraEvaluationSystemPrompt: vi.fn(() => 'clean-context-digest'),
  signAstraEvaluationEvidence: vi.fn(() => 'not-called-during-plan'),
}))

import { getAstraCertificationBenchmarkPlan } from './astra-certification-benchmark.server'
import { listAstraCertificationBenchmarkCases } from './astra-certification-benchmark-suite'

describe('Astra benchmark progress needs verified persisted evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifiedCases.mockResolvedValue([])
  })

  it('does not count metadata-labelled success without authenticated verifier evidence', async () => {
    const result = await getAstraCertificationBenchmarkPlan({ userId: 'owner-1', orgId: null, taskClass: 'reasoning' })
    expect(result.completedCases).toBe(0)
    expect(result.cases).toHaveLength(20)
    expect(result.cases.every((item) => !item.completed)).toBe(true)
    expect(mocks.verifiedCases).toHaveBeenCalledWith({ userId: 'owner-1', orgId: null, taskClass: 'reasoning' })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('counts distinct, exact current-suite cases confirmed by the verifier only', async () => {
    const cases = listAstraCertificationBenchmarkCases('reasoning')
    mocks.verifiedCases.mockResolvedValue([
      cases[0]!.caseId, cases[1]!.caseId, cases[1]!.caseId, 'v1-03-multi-step-planning', 'unknown-id',
    ])
    const result = await getAstraCertificationBenchmarkPlan({ userId: 'owner-1', taskClass: 'reasoning' })
    expect(result.completedCases).toBe(2)
    expect(result.cases.filter((item) => item.completed).map((item) => item.caseId))
      .toEqual([cases[0]!.caseId, cases[1]!.caseId])
    expect(result.suiteId).toBe('blackstar-astra-reasoning-certification-v2')
  })

  it('propagates a verifier database error rather than pretending any case succeeded', async () => {
    mocks.verifiedCases.mockRejectedValue(new Error('Evaluation evidence unavailable'))
    await expect(getAstraCertificationBenchmarkPlan({ userId: 'owner-1', taskClass: 'coding' }))
      .rejects.toThrow('Evaluation evidence unavailable')
  })
})
