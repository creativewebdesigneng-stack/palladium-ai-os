import { describe, expect, it } from 'vitest'
import { evaluateCounterfactual, rankCounterfactuals, selectCounterfactual } from '../counterfactual'

describe('Blackstar Counterfactual Engine', () => {
  it('blocks unsafe or irreversible scenarios by default', () => {
    const result = evaluateCounterfactual({
      id: 'unsafe', label: 'Unsafe', expectedOutcome: 1, confidence: 0.9,
      cost: 10, risk: 'high', reversible: false,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain('risk_not_allowed')
    expect(result.reasons).toContain('irreversible_change_blocked')
  })

  it('requires approval for allowed medium-risk scenarios', () => {
    const result = evaluateCounterfactual({
      id: 'medium', label: 'Medium', expectedOutcome: 0.8, confidence: 0.9,
      cost: 20, risk: 'medium', reversible: true,
    }, { maxCost: 100 })
    expect(result.allowed).toBe(true)
    expect(result.requiresApproval).toBe(true)
  })

  it('ranks allowed scenarios ahead of blocked alternatives', () => {
    const ranked = rankCounterfactuals([
      { id: 'blocked', label: 'Blocked', expectedOutcome: 2, confidence: 0.95, cost: 1, risk: 'high', reversible: true },
      { id: 'safe', label: 'Safe', expectedOutcome: 0.7, confidence: 0.9, cost: 1, risk: 'low', reversible: true },
    ])
    expect(ranked[0]?.id).toBe('safe')
    expect(selectCounterfactual(ranked)?.id).toBe('safe')
  })

  it('enforces confidence and cost ceilings', () => {
    const result = evaluateCounterfactual({
      id: 'expensive', label: 'Expensive', expectedOutcome: 1, confidence: 0.5,
      cost: 200, risk: 'low', reversible: true,
    }, { maxCost: 100, minConfidence: 0.7 })
    expect(result.reasons).toEqual(expect.arrayContaining(['confidence_below_policy', 'cost_above_policy']))
  })
})
