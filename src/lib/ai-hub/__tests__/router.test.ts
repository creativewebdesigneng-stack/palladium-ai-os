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

  it('enforces latency, cost and currency budgets before routing', () => {
    const workload: AiHubWorkload = {
      id: 'budgeted', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Fast affordable inference',
      requirements: {
        capabilities: ['inference'],
        preferredKinds: ['model'],
        maxLatencyMs: 500,
        maxCostMinorUnits: 10,
        currency: 'GBP',
      },
    }
    const capabilities: AiHubCapabilityRef[] = [
      { id: 'too-slow', kind: 'model', providerId: 'provider', name: 'Slow', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 900, estimatedCostMinorUnits: 5, currency: 'GBP' },
      { id: 'wrong-currency', kind: 'model', providerId: 'provider', name: 'USD', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 200, estimatedCostMinorUnits: 5, currency: 'USD' },
      { id: 'too-expensive', kind: 'model', providerId: 'provider', name: 'Expensive', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 200, estimatedCostMinorUnits: 20, currency: 'GBP' },
      { id: 'eligible', kind: 'model', providerId: 'provider', name: 'Eligible', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 300, estimatedCostMinorUnits: 7, currency: 'GBP' },
    ]

    const decision = routeAiHubWorkload(workload, capabilities)
    expect(decision?.capability.id).toBe('eligible')
    expect(decision?.policyChecks).toEqual(expect.arrayContaining(['latency-budget', 'cost-budget']))
  })

  it('chooses lower cost, then lower latency, without reordering exact ties', () => {
    const workload: AiHubWorkload = {
      id: 'ranked', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Choose efficient inference',
      requirements: { capabilities: ['inference'], preferredKinds: ['model'] },
    }
    const capabilities: AiHubCapabilityRef[] = [
      { id: 'baseline', kind: 'model', providerId: 'provider', name: 'Baseline', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 100, estimatedCostMinorUnits: 8, currency: 'GBP' },
      { id: 'cheaper-slow', kind: 'model', providerId: 'provider', name: 'Cheaper', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 300, estimatedCostMinorUnits: 4, currency: 'GBP' },
      { id: 'cheaper-fast', kind: 'model', providerId: 'provider', name: 'Cheaper fast', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 150, estimatedCostMinorUnits: 4, currency: 'GBP' },
    ]

    expect(routeAiHubWorkload(workload, capabilities)?.capability.id).toBe('cheaper-fast')
  })
})
