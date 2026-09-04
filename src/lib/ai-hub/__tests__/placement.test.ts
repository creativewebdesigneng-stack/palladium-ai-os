import { describe, expect, it } from 'vitest'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'
import { planAiHubPlacement } from '../placement'

const capability: AiHubCapabilityRef = {
  id: 'reasoner',
  kind: 'model',
  providerId: 'palladium-model-gateway',
  name: 'Reasoner',
  capabilities: ['reasoning'],
  deploymentTargets: ['provider-cloud', 'customer-cloud', 'on-prem'],
  regions: ['uk', 'eu'],
}

function workload(overrides: Partial<AiHubWorkload['requirements']> = {}): AiHubWorkload {
  return {
    id: 'workload-1',
    tenantId: 'tenant-1',
    actorId: 'actor-1',
    goal: 'Run a governed workload',
    requirements: {
      capabilities: ['reasoning'],
      ...overrides,
    },
  }
}

describe('Blackstar Agent Cloud placement', () => {
  it('prefers the canonical cloud order for ordinary workloads', () => {
    const placement = planAiHubPlacement(workload(), capability)
    expect(placement).toMatchObject({
      deploymentTarget: 'provider-cloud',
      region: 'uk',
      privateExecution: false,
    })
  })

  it('places private workloads only on private execution targets', () => {
    const placement = planAiHubPlacement(workload({ requirePrivateExecution: true }), capability)
    expect(placement).toMatchObject({
      deploymentTarget: 'customer-cloud',
      privateExecution: true,
    })
    expect(placement?.policyChecks).toContain('private-execution')
  })

  it('honours required deployment targets and regions deterministically', () => {
    const placement = planAiHubPlacement(
      workload({ requiredDeploymentTargets: ['on-prem'], requiredRegions: ['eu'] }),
      capability,
    )
    expect(placement).toMatchObject({ deploymentTarget: 'on-prem', region: 'eu' })
  })

  it('fails closed when no requested region can be placed', () => {
    expect(planAiHubPlacement(workload({ requiredRegions: ['us'] }), capability)).toBeNull()
  })

  it('places offline workloads only on explicitly offline-capable edge targets', () => {
    const edgeCapability: AiHubCapabilityRef = {
      ...capability,
      id: 'edge-reasoner',
      deploymentTargets: ['provider-cloud', 'edge', 'device'],
      metadata: { offlineCapable: true, minDeviceMemoryMb: 4096 },
    }
    const placement = planAiHubPlacement(
      workload({ requireOfflineExecution: true, maxDeviceMemoryMb: 8192 }),
      edgeCapability,
    )
    expect(placement).toMatchObject({ deploymentTarget: 'edge', privateExecution: true })
    expect(placement?.policyChecks).toContain('offline-capability')
    expect(placement?.policyChecks).toContain('edge-placement')
  })

  it('fails closed when edge memory is insufficient', () => {
    const edgeCapability: AiHubCapabilityRef = {
      ...capability,
      deploymentTargets: ['edge'],
      metadata: { offlineCapable: true, minDeviceMemoryMb: 8192 },
    }
    expect(planAiHubPlacement(
      workload({ requireOfflineExecution: true, maxDeviceMemoryMb: 4096 }),
      edgeCapability,
    )).toBeNull()
  })
})
