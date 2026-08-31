import { describe, expect, it } from 'vitest'
import { AiHubOrchestrator } from '../orchestrator'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'

const capability: AiHubCapabilityRef = {
  id: 'private-reasoner',
  kind: 'model',
  providerId: 'palladium-model-gateway',
  name: 'Private Reasoner',
  capabilities: ['reasoning'],
  deploymentTargets: ['on-prem'],
  regions: ['uk'],
}

const workload: AiHubWorkload = {
  id: 'workload-1',
  tenantId: 'tenant-1',
  actorId: 'actor-1',
  goal: 'Analyse confidential enterprise data',
  requirements: {
    capabilities: ['reasoning'],
    preferredKinds: ['model'],
    requiredDeploymentTargets: ['on-prem'],
    requiredRegions: ['uk'],
    requirePrivateExecution: true,
    requireHumanApproval: true,
  },
}

describe('AiHubOrchestrator', () => {
  it('creates a policy-bound plan from discovery and routing', () => {
    const orchestrator = new AiHubOrchestrator(() => [capability])
    const plan = orchestrator.plan({ workload })

    expect(plan?.route.capability.id).toBe('private-reasoner')
    expect(plan?.requiresApproval).toBe(true)
    expect(plan?.executionBoundary).toBe('palladium-policy-gateway')
    expect(plan?.route.policyChecks).toEqual(expect.arrayContaining(['tenant-isolation', 'private-execution', 'approval-required']))
  })

  it('returns null when no registered capability can satisfy the workload', () => {
    const orchestrator = new AiHubOrchestrator(() => [])
    expect(orchestrator.plan({ workload })).toBeNull()
  })
})
