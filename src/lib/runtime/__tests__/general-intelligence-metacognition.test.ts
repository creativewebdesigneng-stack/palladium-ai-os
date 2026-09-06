import { describe, expect, it, vi } from 'vitest'
import { loadVerifiedExperienceMetacognition, renderMetacognitionControl } from '../general-intelligence-metacognition.server'

function mockSb(rows: unknown[]) {
  const query: Record<string, any> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'is']) {
    query[method] = vi.fn(() => query)
  }
  query['then'] = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null })
  return { sb: { from: vi.fn(() => query) }, query }
}

describe('general intelligence metacognition', () => {
  it('extracts only bounded verifier-approved execution signals', async () => {
    const { sb, query } = mockSb([
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
    ])

    const snapshot = await loadVerifiedExperienceMetacognition({
      sb,
      userId: 'user-1',
      orgId: 'org-1',
      agentId: 'agent-1',
    })

    expect(query['select']).toHaveBeenCalledWith('metadata,created_at')
    expect(query['select'].mock.calls[0]?.[0]).not.toContain('content')
    expect(query['eq']).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query['eq']).toHaveBeenCalledWith('agent_id', 'agent-1')
    expect(query['eq']).toHaveBeenCalledWith('category', 'verified_experience')
    expect(query['eq']).toHaveBeenCalledWith('source', 'agent_verifier')
    expect(query['eq']).toHaveBeenCalledWith('org_id', 'org-1')
    expect(snapshot.experience_count).toBe(2)
    expect(snapshot.strengths).toEqual(['Inspect evidence', 'Verify output'])
    expect(snapshot.cautions).toContain('A comparable verified run required 1 re-plan before completion.')
    expect(snapshot.evidence).toEqual(['Deployment returned READY', 'Tests passed'])
  })

  it('uses an explicit null organisation boundary for personal-scope metacognition', async () => {
    const { sb, query } = mockSb([])

    await loadVerifiedExperienceMetacognition({
      sb,
      userId: 'user-1',
      orgId: null,
      agentId: 'agent-1',
    })

    expect(query['is']).toHaveBeenCalledWith('org_id', null)
    expect(query['eq']).not.toHaveBeenCalledWith('org_id', expect.anything())
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
