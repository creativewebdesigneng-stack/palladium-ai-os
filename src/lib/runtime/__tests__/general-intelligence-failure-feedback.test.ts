import { describe, expect, it, vi } from 'vitest'
import {
  loadGeneralIntelligenceFailureFeedback,
  renderGeneralIntelligenceFailureFeedback,
} from '../general-intelligence-failure-feedback.server'

function mockSb(rows: unknown[]) {
  const query: Record<string, any> = {}
  for (const method of ['select', 'eq', 'order', 'limit']) query[method] = vi.fn(() => query)
  query['then'] = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null })
  return { sb: { from: vi.fn(() => query) }, query }
}

describe('General Intelligence failure feedback', () => {
  it('reduces recent failures to recurring aggregate categories only', async () => {
    const { sb, query } = mockSb([
      {
        agent_id: 'agent-1',
        status: 'failed',
        error: 'GitHub integration fetch failed with PRIVATE DETAILS',
        replan_count: 2,
        verification_state: { issues: ['PRIVATE verifier issue'] },
      },
      {
        agent_id: 'agent-1',
        status: 'failed',
        error: 'GitHub API connection failed with MORE PRIVATE DETAILS',
        replan_count: 3,
        verification_state: { issues: ['ANOTHER PRIVATE verifier issue'] },
      },
    ])

    const feedback = await loadGeneralIntelligenceFailureFeedback({ sb, agentId: 'agent-1' })

    expect(query['select']).toHaveBeenCalledWith(
      'agent_id,status,error,replan_count,verification_state,provider,model,duration_ms,created_at',
    )
    expect(query['eq']).toHaveBeenCalledWith('agent_id', 'agent-1')
    expect(feedback.recent_runs).toBe(2)
    expect(feedback.failed_runs).toBe(2)
    expect(feedback.high_replan_runs).toBe(2)
    expect(feedback.recurring_patterns).toEqual(expect.arrayContaining([
      { kind: 'tool', count: 2 },
      { kind: 'replan', count: 2 },
      { kind: 'verification', count: 2 },
    ]))

    const rendered = renderGeneralIntelligenceFailureFeedback(feedback)
    expect(rendered).toContain('BLACKSTAR VERIFIED FAILURE FEEDBACK')
    expect(rendered).toContain('tool:2')
    expect(rendered).toContain('replan:2')
    expect(rendered).toContain('verification:2')
    expect(rendered).not.toContain('PRIVATE DETAILS')
    expect(rendered).not.toContain('PRIVATE verifier issue')
  })

  it('does not inject one-off failures into planning', async () => {
    const { sb } = mockSb([
      {
        agent_id: 'agent-1',
        status: 'failed',
        error: 'One transient timeout',
        replan_count: 0,
        verification_state: {},
      },
    ])

    const feedback = await loadGeneralIntelligenceFailureFeedback({ sb, agentId: 'agent-1' })
    expect(feedback.recurring_patterns).toEqual([])
    expect(renderGeneralIntelligenceFailureFeedback(feedback)).toBe('')
  })

  it('keeps recurring failure feedback advisory and non-authoritative', () => {
    const rendered = renderGeneralIntelligenceFailureFeedback({
      version: 1,
      recent_runs: 8,
      failed_runs: 3,
      high_replan_runs: 2,
      recurring_patterns: [
        { kind: 'tool', count: 3 },
        { kind: 'verification', count: 2 },
      ],
    })

    expect(rendered).toContain('advisory planning cautions only')
    expect(rendered).toContain('Do not infer the cause')
    expect(rendered).toContain('alter permissions')
    expect(rendered).toContain('grant tools')
    expect(rendered).toContain('bypass approvals')
    expect(rendered).toContain('change providers')
    expect(rendered).toContain('independent verification')
  })
})
