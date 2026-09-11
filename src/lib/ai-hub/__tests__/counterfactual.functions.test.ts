import { describe, expect, it } from 'vitest'
import { validateCounterfactualRequest } from '../counterfactual.functions'

const base = () => ({
  decisionId: 'decision-1',
  scenarios: [
    { id: 'a', label: 'Option A', expectedOutcome: 0.8, confidence: 0.9, cost: 10, risk: 'low', reversible: true },
    { id: 'b', label: 'Option B', expectedOutcome: 0.7, confidence: 0.8, cost: 20, risk: 'medium', reversible: true },
  ],
  policy: { minConfidence: 0.6, maxCost: 100, allowedRisk: ['low', 'medium'], requireReversible: true },
})

describe('Blackstar counterfactual planning input', () => {
  it('accepts bounded alternatives and policy', () => {
    const parsed = validateCounterfactualRequest(base())
    expect(parsed.scenarios).toHaveLength(2)
    expect(parsed.policy?.maxCost).toBe(100)
  })

  it('requires at least two alternatives', () => {
    const input = base()
    input.scenarios = [input.scenarios[0]!]
    expect(() => validateCounterfactualRequest(input)).toThrow()
  })

  it('rejects out-of-range confidence and unbounded scenario counts', () => {
    const input = base()
    input.scenarios[0]!.confidence = 2
    expect(() => validateCounterfactualRequest(input)).toThrow()
    expect(() => validateCounterfactualRequest({ ...base(), scenarios: Array.from({ length: 21 }, (_, index) => ({ ...base().scenarios[0], id: String(index) })) })).toThrow()
  })
})
