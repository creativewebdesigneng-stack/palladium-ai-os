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
    expect(decision?.policyChecks).toEqual(expect.arrayContaining(['latency-budget', 'cost-budget', 'intelligence-routing']))
  })

  it('chooses lower cost, then lower latency when intelligence signals are neutral', () => {
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

  it('can prefer a slightly more expensive provider when reliability history is materially stronger', () => {
    const workload: AiHubWorkload = {
      id: 'reliable', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Choose dependable inference',
      requirements: { capabilities: ['inference'], preferredKinds: ['model'], routingObjective: 'highest-reliability' },
    }
    const capabilities: AiHubCapabilityRef[] = [
      {
        id: 'cheap-flaky', kind: 'model', providerId: 'provider-a', name: 'Cheap flaky', capabilities: ['inference'],
        deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 150, estimatedCostMinorUnits: 3, currency: 'GBP',
        metadata: { recentRuns: '100', succeededRuns: '55', failedRuns: '45' },
      },
      {
        id: 'stable', kind: 'model', providerId: 'provider-b', name: 'Stable', capabilities: ['inference'],
        deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 180, estimatedCostMinorUnits: 5, currency: 'GBP',
        metadata: { recentRuns: '100', succeededRuns: '98', failedRuns: '2' },
      },
    ]

    const decision = routeAiHubWorkload(workload, capabilities)
    expect(decision?.capability.id).toBe('stable')
    expect(decision?.routingSignals?.reliabilityScore).toBeGreaterThan(0.9)
    expect(decision?.policyChecks).toContain('reliability-telemetry')
  })

  it('uses evaluation trust for quality routing without treating missing history as perfect', () => {
    const workload: AiHubWorkload = {
      id: 'quality', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Choose the highest evaluated quality',
      requirements: { capabilities: ['reasoning'], preferredKinds: ['model'], routingObjective: 'highest-quality' },
    }
    const capabilities: AiHubCapabilityRef[] = [
      {
        id: 'unknown-quality', kind: 'model', providerId: 'provider-a', name: 'Unknown', capabilities: ['reasoning'],
        deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 100, estimatedCostMinorUnits: 4, currency: 'GBP',
      },
      {
        id: 'evaluated', kind: 'model', providerId: 'provider-b', name: 'Evaluated', capabilities: ['reasoning'],
        deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 110, estimatedCostMinorUnits: 5, currency: 'GBP',
        metadata: { evalCount: '20', evalAverageScore: '94.0' },
      },
    ]

    const decision = routeAiHubWorkload(workload, capabilities)
    expect(decision?.capability.id).toBe('evaluated')
    expect(decision?.routingSignals?.qualityScore).toBeCloseTo(0.94)
    expect(decision?.policyChecks).toContain('evaluation-trust')
  })

  it('keeps exact score, cost and latency ties deterministic by preserving discovery order', () => {
    const workload: AiHubWorkload = {
      id: 'tie', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Deterministic routing',
      requirements: { capabilities: ['inference'], preferredKinds: ['model'] },
    }
    const capabilities: AiHubCapabilityRef[] = [
      { id: 'first', kind: 'model', providerId: 'provider-a', name: 'First', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 100, estimatedCostMinorUnits: 4 },
      { id: 'second', kind: 'model', providerId: 'provider-b', name: 'Second', capabilities: ['inference'], deploymentTargets: ['provider-cloud'], estimatedLatencyMs: 100, estimatedCostMinorUnits: 4 },
    ]

    expect(routeAiHubWorkload(workload, capabilities)?.capability.id).toBe('first')
  })
})
