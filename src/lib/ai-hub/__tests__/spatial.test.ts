import { describe, expect, it } from 'vitest'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'
import { AiHubOrchestrator } from '../orchestrator'
import type { AiHubSpatialRequirement } from '../spatial'
import { planAiHubSpatialContext } from '../spatial'

const spatialCapability: AiHubCapabilityRef = {
  id: 'spatial-agent',
  kind: 'agent',
  providerId: 'blackstar-runtime',
  name: 'Spatial Agent',
  capabilities: ['spatial-reasoning'],
  deploymentTargets: ['edge', 'device'],
  metadata: {
    offlineCapable: true,
    spatial: {
      sceneIds: ['factory-a', 'warehouse-b'],
      zoneIds: ['assembly', 'loading'],
      actions: ['inspect', 'navigate', 'observe'],
    },
  },
}

function workload(spatial: AiHubSpatialRequirement): AiHubWorkload {
  return {
    id: 'spatial-workload',
    tenantId: 'tenant-1',
    actorId: 'actor-1',
    goal: 'Inspect a governed spatial zone',
    requirements: {
      capabilities: ['spatial-reasoning'],
      requiredDeploymentTargets: ['edge'],
      spatial,
    },
  }
}

describe('Blackstar Spatial', () => {
  it('authorises a bounded scene, zone, position and action scope', () => {
    const decision = planAiHubSpatialContext(
      workload({
        sceneId: 'factory-a',
        zoneId: 'assembly',
        position: { x: 3, y: 4, z: 0 },
        maxDistanceFromOrigin: 5,
        requiredActions: ['observe', 'inspect'],
      }),
      spatialCapability,
    )

    expect(decision).toMatchObject({
      sceneId: 'factory-a',
      zoneId: 'assembly',
      allowedActions: ['inspect', 'observe'],
    })
    expect(decision?.policyChecks).toContain('coordinate-boundary')
    expect(decision?.policyChecks).toContain('spatial-action-scope')
  })

  it('fails closed for a scene outside the capability boundary', () => {
    expect(planAiHubSpatialContext(workload({ sceneId: 'unknown-scene' }), spatialCapability)).toBeNull()
  })

  it('fails closed for an unauthorised spatial action', () => {
    expect(planAiHubSpatialContext(
      workload({ sceneId: 'factory-a', requiredActions: ['manipulate'] }),
      spatialCapability,
    )).toBeNull()
  })

  it('fails closed when a coordinate exceeds its bounded radius', () => {
    expect(planAiHubSpatialContext(
      workload({ sceneId: 'factory-a', position: { x: 10, y: 0, z: 0 }, maxDistanceFromOrigin: 5 }),
      spatialCapability,
    )).toBeNull()
  })

  it('makes Spatial a mandatory part of orchestration when requested', () => {
    const orchestrator = new AiHubOrchestrator(() => [spatialCapability])
    const plan = orchestrator.plan({
      workload: workload({ sceneId: 'factory-a', zoneId: 'assembly', requiredActions: ['inspect'] }),
    })

    expect(plan?.spatial).toMatchObject({ sceneId: 'factory-a', zoneId: 'assembly' })

    const rejected = orchestrator.plan({ workload: workload({ sceneId: 'factory-a', zoneId: 'restricted' }) })
    expect(rejected).toBeNull()
  })
})
