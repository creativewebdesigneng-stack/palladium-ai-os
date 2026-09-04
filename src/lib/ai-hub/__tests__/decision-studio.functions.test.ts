import { describe, expect, it } from 'vitest'
import {
  validateCounterfactualDecisionRequest,
  validateOptimizationDecisionRequest,
} from '../decision-studio.functions'

describe('Blackstar Decision Studio server input', () => {
  it('accepts a bounded optimization decision request', () => {
    const result = validateOptimizationDecisionRequest({
      metrics: [{ id: 'conversion', current: 0.12, target: 0.2, direction: 'increase' }],
      candidates: [{
        id: 'checkout-copy',
        title: 'Improve checkout copy',
        expectedImpact: 0.4,
        confidence: 0.8,
        risk: 'low',
        cost: 500,
        reversible: true,
        affectedMetrics: ['conversion'],
      }],
      policy: { maximumCandidates: 3, minimumConfidence: 0.7, allowedRisk: 'medium' },
    })
    expect(result.metrics[0]?.id).toBe('conversion')
    expect(result.candidates[0]?.risk).toBe('low')
  })

  it('rejects invalid optimization confidence and empty candidate sets', () => {
    expect(() => validateOptimizationDecisionRequest({ metrics: [], candidates: [] })).toThrow()
    expect(() => validateOptimizationDecisionRequest({
      metrics: [{ id: 'm', current: 1, target: 2, direction: 'increase' }],
      candidates: [{ id: 'c', title: 'Bad', expectedImpact: 0.2, confidence: 1.5, risk: 'low', affectedMetrics: ['m'] }],
    })).toThrow()
  })

  it('accepts governed counterfactual scenarios and rejects invalid risk', () => {
    const result = validateCounterfactualDecisionRequest({
      scenarios: [{
        id: 'a',
        label: 'Launch in one market',
        expectedOutcome: 0.7,
        confidence: 0.82,
        cost: 1000,
        risk: 'medium',
        reversible: true,
        assumptions: ['Demand remains stable'],
      }],
      policy: { minConfidence: 0.7, maxCost: 5000, allowedRisk: ['low', 'medium'] },
    })
    expect(result.scenarios[0]?.label).toBe('Launch in one market')

    expect(() => validateCounterfactualDecisionRequest({
      scenarios: [{ id: 'x', label: 'X', expectedOutcome: 1, confidence: 0.9, cost: 1, risk: 'critical', reversible: true }],
    })).toThrow()
  })
})
