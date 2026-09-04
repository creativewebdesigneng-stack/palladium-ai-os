import { describe, expect, it } from 'vitest'
import { validateOpportunityExecutionInput } from '../opportunity-execution.functions'

const base = () => ({
  id: 'opp-exec-1',
  signalId: 'signal-1',
  kind: 'growth',
  title: 'New market demand',
  summary: 'Demand is increasing in a target segment.',
  score: 0.82,
  confidence: 0.9,
  evidence: ['crm trend', 'market signal'],
  recommendedAction: 'Create a governed growth experiment',
  actionRisk: 'low',
  requiresApproval: false,
  policyChecks: ['signal-validity'],
  stages: [
    {
      id: 'research',
      goal: 'Research the opportunity',
      capabilities: ['web_search'],
      preferredKinds: ['agent'],
    },
  ],
})

describe('Blackstar opportunity execution server input', () => {
  it('accepts a bounded valid opportunity plan', () => {
    const result = validateOpportunityExecutionInput(base())
    expect(result.id).toBe('opp-exec-1')
    expect(result.stages).toHaveLength(1)
    expect(result.stages[0]?.preferredKinds).toEqual(['agent'])
  })

  it('rejects invalid scores and empty execution stages', () => {
    expect(() => validateOpportunityExecutionInput({ ...base(), score: 2 })).toThrow(/score/i)
    expect(() => validateOpportunityExecutionInput({ ...base(), stages: [] })).toThrow(/between 1 and 20/i)
  })

  it('drops unknown preferred capability kinds instead of trusting the client', () => {
    const input = base()
    input.stages[0]!.preferredKinds = ['agent', 'made-up'] as never
    const result = validateOpportunityExecutionInput(input)
    expect(result.stages[0]?.preferredKinds).toEqual(['agent'])
  })
})
