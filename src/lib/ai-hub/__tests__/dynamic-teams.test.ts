import { describe, expect, it } from 'vitest'
import { formDynamicAgentTeam } from '../dynamic-teams'

describe('Blackstar Dynamic Agent Teams', () => {
  const candidates = [
    { agentId: 'a', capabilities: ['research', 'analysis'], trustScore: 0.95, available: true, activeWorkloads: 1 },
    { agentId: 'b', capabilities: ['execute'], trustScore: 0.9, available: true, activeWorkloads: 1 },
    { agentId: 'c', capabilities: ['execute', 'analysis'], trustScore: 0.5, available: true, activeWorkloads: 0 },
  ]

  it('forms the smallest trusted team covering the mission', () => {
    const plan = formDynamicAgentTeam(candidates, { missionId: 'm', requiredCapabilities: ['research', 'analysis', 'execute'] })
    expect(plan.ready).toBe(true)
    expect(plan.agentIds).toEqual(['a', 'b'])
    expect(plan.missingCapabilities).toEqual([])
  })

  it('excludes candidates below the trust boundary', () => {
    const plan = formDynamicAgentTeam(candidates, { missionId: 'm', requiredCapabilities: ['execute'], minTrustScore: 0.8 })
    expect(plan.capabilityAssignments['execute']).toBe('b')
  })

  it('fails closed when required capability cannot be covered', () => {
    const plan = formDynamicAgentTeam(candidates, { missionId: 'm', requiredCapabilities: ['research', 'payments'] })
    expect(plan.ready).toBe(false)
    expect(plan.missingCapabilities).toEqual(['payments'])
  })

  it('honours bounded team size', () => {
    const plan = formDynamicAgentTeam(candidates, { missionId: 'm', requiredCapabilities: ['research', 'execute'], maxTeamSize: 1 })
    expect(plan.ready).toBe(false)
    expect(plan.agentIds).toHaveLength(1)
  })
})
