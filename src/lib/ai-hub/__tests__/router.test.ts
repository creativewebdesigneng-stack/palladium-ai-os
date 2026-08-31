import { describe, expect, it } from 'vitest'
import { createPalladiumAiHubRegistry } from '../registry'
import { routeAiHubWorkload } from '../router'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'

describe('AI Hub foundation', () => {
  it('registers existing Palladium systems as adapters instead of duplicating them', () => {
    const registry = createPalladiumAiHubRegistry()
    expect(registry.listProviders().map((provider) => provider.adapter)).toEqual(expect.arrayContaining([
      'model-gateway', 'agent-runtime', 'mcp', 'skills', 'workflows', 'app-studio',
    ]))
  })

  it('routes workloads only to capabilities satisfying deployment and capability policy', () => {
    const workload: AiHubWorkload = {
      id: 'workload-1', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Run a private coding model',
      requirements: { capabilities: ['code'], preferredKinds: ['model'], requirePrivateExecution: true },
    }
    const capabilities: AiHubCapabilityRef[] = [
      { id: 'public-model', kind: 'model', providerId: 'provider', name: 'Public', capabilities: ['code'], deploymentTargets: ['provider-cloud'] },
      { id: 'private-model', kind: 'model', providerId: 'provider', name: 'Private', capabilities: ['code'], deploymentTargets: ['on-prem'] },
    ]

    expect(routeAiHubWorkload(workload, capabilities)?.capability.id).toBe('private-model')
  })
})
