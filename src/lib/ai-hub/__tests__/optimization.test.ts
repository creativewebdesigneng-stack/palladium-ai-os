import { describe, expect, it } from 'vitest'
import { buildBlackstarOptimizationPlan } from '../optimization'

const metrics = [
  { id: 'conversion', current: 0.2, target: 0.3, direction: 'increase' as const, weight: 2 },
  { id: 'cost', current: 120, target: 90, direction: 'decrease' as const },
]

describe('Blackstar Autonomous Optimization', () => {
  it('ranks high-confidence bounded improvements', () => {
    const plan = buildBlackstarOptimizationPlan(metrics, [
      {
        id: 'a', title: 'Improve conversion path', expectedImpact: 0.8, confidence: 0.9,
        risk: 'low', cost: 10, reversible: true, affectedMetrics: ['conversion'],
      },
      {
        id: 'b', title: 'Minor cost tune', expectedImpact: 0.3, confidence: 0.7,
        risk: 'low', cost: 5, reversible: true, affectedMetrics: ['cost'],
      },
    ], { maximumCost: 100 })

    expect(plan.recommendations[0]?.candidate.id).toBe('a')
    expect(plan.blockedCandidateIds).toEqual([])
  })

  it('blocks candidates outside risk policy', () => {
    const plan = buildBlackstarOptimizationPlan(metrics, [{
      id: 'high', title: 'Risky change', expectedImpact: 1, confidence: 1,
      risk: 'high', reversible: true, affectedMetrics: ['conversion'],
    }])

    expect(plan.recommendations).toHaveLength(0)
    expect(plan.blockedCandidateIds).toContain('high')
  })

  it('requires approval for medium-risk recommendations by default', () => {
    const plan = buildBlackstarOptimizationPlan(metrics, [{
      id: 'medium', title: 'Operational change', expectedImpact: 0.7, confidence: 0.9,
      risk: 'medium', reversible: true, affectedMetrics: ['cost'],
    }])

    expect(plan.requiresApproval).toBe(true)
    expect(plan.recommendations[0]?.requiresApproval).toBe(true)
  })

  it('blocks irreversible changes unless explicitly allowed', () => {
    const plan = buildBlackstarOptimizationPlan(metrics, [{
      id: 'irreversible', title: 'One-way migration', expectedImpact: 0.9, confidence: 0.9,
      risk: 'low', reversible: false, affectedMetrics: ['conversion'],
    }])

    expect(plan.blockedCandidateIds).toContain('irreversible')
  })

  it('enforces cost and confidence boundaries', () => {
    const plan = buildBlackstarOptimizationPlan(metrics, [
      { id: 'expensive', title: 'Expensive', expectedImpact: 1, confidence: 1, risk: 'low', cost: 101, reversible: true, affectedMetrics: ['conversion'] },
      { id: 'uncertain', title: 'Uncertain', expectedImpact: 1, confidence: 0.4, risk: 'low', cost: 1, reversible: true, affectedMetrics: ['conversion'] },
    ], { maximumCost: 100, minimumConfidence: 0.6 })

    expect(plan.blockedCandidateIds).toEqual(expect.arrayContaining(['expensive', 'uncertain']))
  })
})
