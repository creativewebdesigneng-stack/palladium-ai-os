import { describe, expect, it } from 'vitest'
import { countAiHubResources, toAiHubAppResource } from '../resources'

describe('AI Hub App Studio resource mapping', () => {
  it('projects lifecycle state without exposing prompts, source or deployment identifiers', () => {
    const resource = toAiHubAppResource({
      id: 'app-1',
      title: 'Customer Portal',
      status: 'planned',
      source_status: 'generated',
      repository_status: 'files_applied',
      sandbox_status: 'passed',
      deployment_provider: 'vercel',
      deployment_status: 'ready',
      production_status: 'promoted',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:20:00Z',
      prompt: 'must-never-leak',
      plan: { secret: 'private-plan' },
      source_manifest: { files: [{ path: '.env', content: 'TOKEN=secret' }] },
      repository_full_name: 'private/repository',
      branch_name: 'palladium/private',
      provider_deployment_id: 'dep_secret',
      provider_project_id: 'project_secret',
      url: 'https://private-preview.example',
      production_aliases: ['private.example'],
      production_approval_id: 'approval-secret',
    })

    expect(resource).toEqual({
      id: 'app-1',
      kind: 'app',
      name: 'Customer Portal',
      status: 'production',
      providerId: 'palladium-app-studio',
      capabilities: ['app-build', 'source-generated', 'repository-synced', 'sandbox-validated', 'preview-deployed', 'production-deployed'],
      metadata: {
        resourceType: 'builder-app',
        source: 'app-studio',
        sourceStatus: 'generated',
        repositoryStatus: 'files_applied',
        sandboxStatus: 'passed',
        deploymentStatus: 'ready',
        deploymentProvider: 'vercel',
        productionStatus: 'promoted',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:20:00Z',
      },
    })

    const serialized = JSON.stringify(resource)
    expect(serialized).not.toContain('must-never-leak')
    expect(serialized).not.toContain('private-plan')
    expect(serialized).not.toContain('TOKEN=secret')
    expect(serialized).not.toContain('private/repository')
    expect(serialized).not.toContain('dep_secret')
    expect(serialized).not.toContain('project_secret')
    expect(serialized).not.toContain('private-preview.example')
    expect(serialized).not.toContain('private.example')
    expect(serialized).not.toContain('approval-secret')
  })

  it('counts App Studio resources separately', () => {
    const app = toAiHubAppResource({ id: 'app-1', title: 'App' })
    expect(countAiHubResources([app])).toEqual({
      models: 0,
      agents: 0,
      tools: 0,
      mcp: 0,
      apps: 1,
      datasets: 0,
      compute: 0,
      skills: 0,
      marketplace: 0,
      workflows: 0,
      total: 1,
    })
  })
})
