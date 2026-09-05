import { describe, expect, it } from 'vitest'
import { loadVerifiedExperienceMetacognition, renderMetacognitionControl } from '../general-intelligence-metacognition.server'

function mockSb(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: rows, error: null }),
  }
  return { from: () => chain }
}

describe('general intelligence metacognition', () => {
  it('extracts only bounded verifier-approved execution signals', async () => {
    const snapshot = await loadVerifiedExperienceMetacognition({
      sb: mockSb([
        {
          metadata: {
            verification_score: 0.96,
            replan_count: 1,
            completed_steps: ['Inspect evidence', 'Verify output'],
            evidence: ['Deployment returned READY'],
          },
        },
        {
          metadata: {
            verification_score: 0.88,
            replan_count: 0,
            completed_steps: ['Lower-confidence step'],
            evidence: ['Tests passed'],
          },
        },
      ]) as never,
      agentId: 'agent-1',
    })

    expect(snapshot.experience_count).toBe(2)
    expect(snapshot.strengths).toEqual(['Inspect evidence', 'Verify output'])
    expect(snapshot.cautions).toContain('A comparable verified run required 1 re-plan before completion.')
    expect(snapshot.evidence).toEqual(['Deployment returned READY', 'Tests passed'])
  })

  it('renders novel-task caution when no verified history exists', () => {
    const prompt = renderMetacognitionControl({
      version: 1,
      experience_count: 0,
      strengths: [],
      cautions: [],
      evidence: [],
    })
    expect(prompt).toContain('Treat the task as novel')
    expect(prompt).toContain('do not infer competence from unverified history')
  })

  it('requires current independent verification even with prior success', () => {
    const prompt = renderMetacognitionControl({
      version: 1,
      experience_count: 2,
      strengths: ['Inspect evidence'],
      cautions: ['A prior run required a re-plan.'],
      evidence: ['A verifier confirmed success.'],
    })
    expect(prompt).toContain('bounded evidence')
    expect(prompt).toContain('verify the current result independently')
    expect(prompt).toContain('preserve approval boundaries')
  })
})
