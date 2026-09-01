import { describe, expect, it } from 'vitest'
import { countAiHubResources, toAiHubComputeResource } from '../resources'

describe('AI Hub compute resource mapping', () => {
  it('projects deployment targets without exposing provider resource identifiers or credentials', () => {
    const resource = toAiHubComputeResource({
      id: 'target-1',
      provider: 'coolify',
      name: 'Production API',
      resource_kind: 'application',
      resource_uuid: 'private-coolify-uuid',
      user_id: 'private-user-id',
      api_token: 'must-never-leak',
      created_at: '2026-09-01T21:00:00Z',
      updated_at: '2026-09-01T21:10:00Z',
    })

    expect(resource).toEqual({
      id: 'target-1',
      kind: 'compute',
      name: 'Production API',
      status: 'available',
      providerId: 'palladium-deployments:coolify',
      capabilities: ['managed-compute', 'application-deployment'],
      metadata: {
        resourceType: 'deployment-target',
        source: 'deployments',
        provider: 'coolify',
        resourceKind: 'application',
        createdAt: '2026-09-01T21:00:00Z',
        updatedAt: '2026-09-01T21:10:00Z',
      },
    })

    const serialized = JSON.stringify(resource)
    expect(serialized).not.toContain('private-coolify-uuid')
    expect(serialized).not.toContain('private-user-id')
    expect(serialized).not.toContain('must-never-leak')
  })

  it('counts compute resources separately', () => {
    const compute = toAiHubComputeResource({ id: 'target-1', name: 'Target', provider: 'coolify' })
    expect(countAiHubResources([compute])).toEqual({
      models: 0,
      agents: 0,
      tools: 0,
      mcp: 0,
      apps: 0,
      datasets: 0,
      compute: 1,
      skills: 0,
      marketplace: 0,
      workflows: 0,
      total: 1,
    })
  })
})
