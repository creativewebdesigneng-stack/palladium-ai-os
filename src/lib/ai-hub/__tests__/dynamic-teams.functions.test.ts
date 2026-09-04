import { describe, expect, it } from 'vitest'
import { buildDynamicTeamCandidates } from '../dynamic-teams.functions'

describe('Blackstar dynamic team runtime candidates', () => {
  it('combines declared skills and tools with bounded execution trust', () => {
    const candidates = buildDynamicTeamCandidates(
      [{ id: 'agent-1', allowed_tools: ['web_search'], operating_profile: { skills: ['research'] } }],
      [
        { agent_id: 'agent-1', status: 'completed' },
        { agent_id: 'agent-1', status: 'completed' },
        { agent_id: 'agent-1', status: 'failed' },
        { agent_id: 'agent-1', status: 'running' },
      ],
    )

    expect(candidates[0]).toMatchObject({
      agentId: 'agent-1',
      capabilities: ['web_search', 'research'],
      trustScore: 2 / 3,
      activeWorkloads: 1,
      available: true,
    })
  })

  it('uses a conservative default trust score when there is no finished history', () => {
    const [candidate] = buildDynamicTeamCandidates(
      [{ id: 'agent-2', allowed_tools: ['crm'], operating_profile: { skills: ['sales', 'sales'] } }],
      [{ agent_id: 'agent-2', status: 'queued' }],
    )
    expect(candidate?.trustScore).toBe(0.75)
    expect(candidate?.capabilities).toEqual(['crm', 'sales'])
    expect(candidate?.activeWorkloads).toBe(1)
  })
})
