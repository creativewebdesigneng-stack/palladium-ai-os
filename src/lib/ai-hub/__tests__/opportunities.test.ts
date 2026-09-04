import { describe, expect, it } from 'vitest'
import { rankBlackstarOpportunities } from '../opportunities'

describe('Blackstar Opportunity Engine', () => {
  it('ranks high-confidence opportunities by governed score', () => {
    const result = rankBlackstarOpportunities([
      {
        id: 'growth-1',
        kind: 'growth',
        title: 'Expand high-converting channel',
        summary: 'A channel is converting above baseline.',
        confidence: 0.92,
        impact: 0.85,
        urgency: 0.7,
        evidence: ['conversion +21%', 'conversion +21%'],
      },
      {
        id: 'customer-1',
        kind: 'customer',
        title: 'Recover at-risk customers',
        summary: 'A customer segment shows increasing churn risk.',
        confidence: 0.78,
        impact: 0.62,
        urgency: 0.8,
      },
    ])

    expect(result).toHaveLength(2)
    expect(result[0]?.signalId).toBe('growth-1')
    expect(result[0]?.evidence).toEqual(['conversion +21%'])
    expect(result[0]?.requiresApproval).toBe(false)
  })

  it('fails closed on low-confidence or low-score signals', () => {
    const result = rankBlackstarOpportunities([
      {
        id: 'weak-1',
        kind: 'market',
        title: 'Weak signal',
        summary: 'Insufficient evidence.',
        confidence: 0.3,
        impact: 0.2,
        urgency: 0.2,
      },
    ])

    expect(result).toEqual([])
  })

  it('requires approval when recommendation risk exceeds policy boundary', () => {
    const result = rankBlackstarOpportunities([
      {
        id: 'risk-1',
        kind: 'risk',
        title: 'Supplier concentration risk',
        summary: 'Critical dependency exceeds risk tolerance.',
        confidence: 0.96,
        impact: 0.94,
        urgency: 0.9,
      },
    ], { autoActionRisk: 'low' })

    expect(result[0]?.actionRisk).toBe('high')
    expect(result[0]?.requiresApproval).toBe(true)
    expect(result[0]?.policyChecks).toContain('approval-gate')
  })

  it('respects allowed signal kinds and recommendation limits', () => {
    const result = rankBlackstarOpportunities([
      {
        id: 'growth-1', kind: 'growth', title: 'Growth', summary: 'Growth signal', confidence: 1, impact: 1, urgency: 1,
      },
      {
        id: 'cost-1', kind: 'cost', title: 'Cost', summary: 'Cost signal', confidence: 1, impact: 1, urgency: 1,
      },
    ], { allowedKinds: ['growth'], maximumRecommendations: 1 })

    expect(result.map((item) => item.signalId)).toEqual(['growth-1'])
  })
})
