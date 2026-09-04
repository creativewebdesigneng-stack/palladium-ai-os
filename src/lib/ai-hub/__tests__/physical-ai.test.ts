import { describe, expect, it } from 'vitest'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'
import { AiHubOrchestrator } from '../orchestrator'
import { planAiHubPhysicalAction } from '../physical-ai'
import type { AiHubSpatialDecision } from '../spatial'

const capability: AiHubCapabilityRef = {
  id: 'physical-agent',
  kind: 'agent',
  providerId: 'blackstar-runtime',
  name: 'Physical Agent',
  capabilities: ['physical-operation'],
  deploymentTargets: ['edge'],
  metadata: {
    spatial: {
      sceneIds: ['factory-a'],
      zoneIds: ['assembly'],
      actions: ['observe', 'navigate'],
    },
    physical: {
      deviceIds: ['camera-1', 'arm-1'],
      emergencyStopAvailable: true,
      actions: {
        inspect: { risk: 'low', mutating: false, requiresSpatial: true },
        move: { risk: 'medium', mutating: true, requiresSpatial: true },
        shutdown: { risk: 'critical', mutating: true, destructive: true },
      },
    },
  },
}

const spatial: AiHubSpatialDecision = {
  sceneId: 'factory-a',
  zoneId: 'assembly',
  allowedActions: ['observe'],
  policyChecks: ['spatial-capability', 'scene-boundary', 'zone-boundary'],
  reason: 'verified',
}

function workload(action: string, options: { spatial?: boolean } = {}): AiHubWorkload {
  return {
    id: 'physical-workload',
    tenantId: 'tenant-1',
    actorId: 'actor-1',
    goal: 'Operate a governed physical capability',
    requirements: {
      capabilities: ['physical-operation'],
      requiredDeploymentTargets: ['edge'],
      physical: { deviceId: action === 'inspect' ? 'camera-1' : 'arm-1', action },
      ...(options.spatial ? {
        spatial: { sceneId: 'factory-a', zoneId: 'assembly', requiredActions: ['observe'] },
      } : {}),
    },
  }
}

describe('Blackstar Physical AI', () => {
  it('allows bounded read-only physical observation', () => {
    const decision = planAiHubPhysicalAction(workload('inspect', { spatial: true }), capability, spatial)
    expect(decision).toMatchObject({ action: 'inspect', decision: 'allow', requiresApproval: false, risk: 'low' })
    expect(decision?.policyChecks).toContain('spatial-boundary')
  })

  it('requires operator approval for physical mutation', () => {
    const decision = planAiHubPhysicalAction(workload('move', { spatial: true }), capability, spatial)
    expect(decision).toMatchObject({ action: 'move', decision: 'approval', requiresApproval: true })
    expect(decision?.policyChecks).toContain('emergency-stop')
    expect(decision?.policyChecks).toContain('operator-approval')
  })

  it('fails closed when a spatially-bound action has no verified Spatial context', () => {
    expect(planAiHubPhysicalAction(workload('move'), capability)).toBeNull()
  })

  it('fails closed for an unknown device or action', () => {
    const unknownDevice = workload('inspect', { spatial: true })
    unknownDevice.requirements.physical = { deviceId: 'unknown', action: 'inspect' }
    expect(planAiHubPhysicalAction(unknownDevice, capability, spatial)).toBeNull()
  })

  it('fails closed when a mutating capability has no declared emergency stop', () => {
    const unsafeCapability: AiHubCapabilityRef = {
      ...capability,
      metadata: {
        ...capability.metadata,
        physical: {
          deviceIds: ['arm-1'],
          emergencyStopAvailable: false,
          actions: { move: { risk: 'medium', mutating: true, requiresSpatial: true } },
        },
      },
    }
    expect(planAiHubPhysicalAction(workload('move', { spatial: true }), unsafeCapability, spatial)).toBeNull()
  })

  it('propagates physical approval into the canonical orchestration plan', () => {
    const orchestrator = new AiHubOrchestrator(() => [capability])
    const plan = orchestrator.plan({ workload: workload('move', { spatial: true }) })
    expect(plan?.physical).toMatchObject({ action: 'move', requiresApproval: true })
    expect(plan?.requiresApproval).toBe(true)
  })
})
