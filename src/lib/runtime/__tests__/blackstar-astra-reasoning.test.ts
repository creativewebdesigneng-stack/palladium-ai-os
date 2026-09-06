import { describe, expect, it } from 'vitest'
import type { GeneralIntelligenceAssessment } from '@/lib/agents/general-intelligence-kernel'
import {
  renderBlackstarAstraReasoningControl,
  selectBlackstarAstraReasoningControl,
} from '../blackstar-astra-reasoning'

function assessment(overrides: Partial<GeneralIntelligenceAssessment> = {}): GeneralIntelligenceAssessment {
  return {
    version: 1,
    goal: {
      objective: 'Complete the task',
      context: [],
      constraints: [],
      success_criteria: [],
      domains: ['engineering'],
    },
    mode: 'direct',
    confidence: 0.9,
    novelty: 0.1,
    ambiguity: 0.1,
    risk: 0.1,
    selected_agent_ids: ['agent-1'],
    reasons: [],
    requires_approval: false,
    requires_verification: true,
    collective_intelligence_recommended: false,
    ...overrides,
  }
}

describe('Blackstar Astra adaptive reasoning', () => {
  it('uses low effort for routine high-confidence work', () => {
    expect(selectBlackstarAstraReasoningControl(assessment())).toMatchObject({
      effort: 'low',
      verification_passes: 1,
      planner_round_budget: 4,
    })
  })

  it('raises reasoning effort for cross-domain collective work', () => {
    const control = selectBlackstarAstraReasoningControl(assessment({
      goal: { objective: 'Research, design and implement', context: [], constraints: [], success_criteria: [], domains: ['research', 'creative', 'engineering'] },
      mode: 'collective',
      collective_intelligence_recommended: true,
    }))
    expect(control.effort).toBe('high')
    expect(control.rationale).toContain('cross-domain objective')
  })

  it('uses maximum bounded effort for extreme uncertainty without granting authority', () => {
    const control = selectBlackstarAstraReasoningControl(assessment({ confidence: 0.05, ambiguity: 0.95 }))
    expect(control.effort).toBe('max')
    expect(control.verification_passes).toBe(3)
    const prompt = renderBlackstarAstraReasoningControl(control)
    expect(prompt).toContain('never grants tools, approvals, permissions, identity, delegation or execution authority')
    expect(prompt).toContain('Do not reveal hidden chain-of-thought')
  })

  it('fails closed on non-finite assessment values', () => {
    const control = selectBlackstarAstraReasoningControl(assessment({
      confidence: Number.NaN,
      novelty: Number.POSITIVE_INFINITY,
      ambiguity: Number.NaN,
      risk: Number.NaN,
    }))
    expect(control.effort).toBe('max')
  })
})
