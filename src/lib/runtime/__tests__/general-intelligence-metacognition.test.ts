import { describe, expect, it, vi } from 'vitest'
import {
  isComparableVerifiedObjective,
  loadVerifiedExperienceMetacognition,
  renderMetacognitionControl,
} from '../general-intelligence-metacognition.server'

function mockSb(rows: unknown[]) {
  const query: Record<string, any> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'is']) {
    query[method] = vi.fn(() => query)
  }
  query['then'] = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null })
  return { sb: { from: vi.fn(() => query) }, query }
}

function verifiedMetadata(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'verified_experience',
    objective: 'Deploy the storefront application and verify production readiness',
    verification_score: 0.96,
    replan_count: 1,
    completed_steps: ['Inspect deployment evidence', 'Verify production readiness'],
    evidence: ['Deployment returned READY'],
    ...overrides,
  }
}

describe('general intelligence metacognition', () => {
  it('extracts only bounded verifier-approved execution signals relevant to the current objective', async () => {
    const { sb, query } = mockSb([
      { metadata: verifiedMetadata() },
      {
        metadata: verifiedMetadata({
          objective: 'Write a social media launch caption',
          verification_score: 0.99,
          replan_count: 0,
          completed_steps: ['Draft caption'],
          evidence: ['Caption approved'],
        }),
      },
      {
        metadata: verifiedMetadata({
          objective: 'Deploy another storefront application',
          verification_score: 0.88,
          replan_count: 0,
          completed_steps: ['Lower-confidence deployment step'],
          evidence: ['Tests passed'],
        }),
      },
    ])

    const snapshot = await loadVerifiedExperienceMetacognition({
      sb,
      userId: 'user-1',
      orgId: 'org-1',
      agentId: 'agent-1',
      objective: 'Deploy the storefront app and confirm it is production ready',
    })

    expect(query['select']).toHaveBeenCalledWith('metadata,created_at')
    expect(query['select'].mock.calls[0]?.[0]).not.toContain('content')
    expect(query['eq']).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query['eq']).toHaveBeenCalledWith('agent_id', 'agent-1')
    expect(query['eq']).toHaveBeenCalledWith('category', 'verified_experience')
    expect(query['eq']).toHaveBeenCalledWith('source', 'agent_verifier')
    expect(query['eq']).toHaveBeenCalledWith('org_id', 'org-1')
    expect(snapshot.experience_count).toBe(2)
    expect(snapshot.strengths).toEqual(['Inspect deployment evidence', 'Verify production readiness'])
    expect(snapshot.cautions).toContain('A comparable verified run required 1 re-plan before completion.')
    expect(snapshot.evidence).toEqual(['Deployment returned READY', 'Tests passed'])
    expect(JSON.stringify(snapshot)).not.toContain('Caption approved')
  })

  it('rejects low-confidence and malformed verified experience before strategy reuse', async () => {
    const { sb } = mockSb([
      { metadata: verifiedMetadata({ verification_score: 0.74 }) },
      { metadata: verifiedMetadata({ kind: 'fact', verification_score: 0.99 }) },
    ])

    const snapshot = await loadVerifiedExperienceMetacognition({
      sb,
      userId: 'user-1',
      orgId: null,
      agentId: 'agent-1',
      objective: 'Deploy the storefront application',
    })

    expect(snapshot.experience_count).toBe(0)
    expect(snapshot.strengths).toEqual([])
    expect(snapshot.evidence).toEqual([])
  })

  it('uses deterministic bounded objective overlap for comparable-task reuse', () => {
    expect(isComparableVerifiedObjective(
      'Deploy the Shopify storefront and verify production readiness',
      'Verify the Shopify storefront deployment is production ready',
    )).toBe(true)
    expect(isComparableVerifiedObjective(
      'Deploy the Shopify storefront and verify production readiness',
      'Write an Instagram caption for a summer campaign',
    )).toBe(false)
  })

  it('uses an explicit null organisation boundary for personal-scope metacognition', async () => {
    const { sb, query } = mockSb([])

    await loadVerifiedExperienceMetacognition({
      sb,
      userId: 'user-1',
      orgId: null,
      agentId: 'agent-1',
      objective: 'Deploy the storefront application',
    })

    expect(query['is']).toHaveBeenCalledWith('org_id', null)
    expect(query['eq']).not.toHaveBeenCalledWith('org_id', expect.anything())
  })

  it('renders novel-task caution when no comparable verified history exists', () => {
    const prompt = renderMetacognitionControl({
      version: 1,
      experience_count: 0,
      strengths: [],
      cautions: [],
      evidence: [],
    })
    expect(prompt).toContain('Treat the task as novel')
    expect(prompt).toContain('unrelated or unverified history')
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
