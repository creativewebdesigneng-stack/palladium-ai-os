import { describe, expect, it } from 'vitest'
import {
  BLACKSTAR_ASTRA_PLANNER_HARD_MAX_ROUNDS,
  BLACKSTAR_ASTRA_VERIFICATION_HARD_MAX_PASSES,
  combineBlackstarAstraVerificationDecisions,
  resolveBlackstarAstraPlannerPolicy,
} from '../blackstar-astra-planner-policy'

describe('Blackstar Astra planner policy', () => {
  it('preserves the existing planner defaults without Astra control', () => {
    expect(resolveBlackstarAstraPlannerPolicy()).toEqual({
      model_round_budget: 10,
      verification_passes: 1,
    })
  })

  it('consumes an adaptive reasoning budget without exceeding hard limits', () => {
    expect(resolveBlackstarAstraPlannerPolicy({
      version: 1,
      effort: 'high',
      planner_round_budget: 8,
      verification_passes: 2,
      rationale: ['cross-domain objective'],
    })).toEqual({ model_round_budget: 8, verification_passes: 2 })

    expect(resolveBlackstarAstraPlannerPolicy({
      version: 1,
      effort: 'max',
      planner_round_budget: 999,
      verification_passes: 999,
      rationale: ['test'],
    })).toEqual({
      model_round_budget: BLACKSTAR_ASTRA_PLANNER_HARD_MAX_ROUNDS,
      verification_passes: BLACKSTAR_ASTRA_VERIFICATION_HARD_MAX_PASSES,
    })
  })

  it('combines repeated verification fail-closed', () => {
    const combined = combineBlackstarAstraVerificationDecisions([
      { passed: true, score: 0.96, issues: [], evidence: ['build passed'], next_action: 'complete', revised_steps: [] },
      { passed: false, score: 0.74, issues: ['missing evidence'], evidence: ['tests passed'], next_action: 'replan', revised_steps: [] },
    ])

    expect(combined.passed).toBe(false)
    expect(combined.score).toBe(0.74)
    expect(combined.next_action).toBe('replan')
    expect(combined.evidence).toEqual(['build passed', 'tests passed'])
  })

  it('gives escalation precedence across verification passes', () => {
    const combined = combineBlackstarAstraVerificationDecisions([
      { passed: false, score: 0.8, issues: ['approval required'], evidence: [], next_action: 'escalate', revised_steps: [] },
      { passed: false, score: 0.8, issues: ['retry possible'], evidence: [], next_action: 'replan', revised_steps: [] },
    ])
    expect(combined.next_action).toBe('escalate')
  })
})
