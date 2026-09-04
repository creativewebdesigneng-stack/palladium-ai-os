import type { HarnessDecision, HarnessRisk } from '@/lib/runtime/agent-harness'
import { evaluateHarnessPolicy } from '@/lib/runtime/agent-harness'
import type { AiHubCapabilityRef, AiHubWorkload } from './contracts'
import type { AiHubSpatialDecision } from './spatial'

export interface AiHubPhysicalRequirement {
  deviceId: string
  action: string
}

export interface AiHubPhysicalDecision {
  deviceId: string
  action: string
  decision: Exclude<HarnessDecision, 'deny'>
  risk: HarnessRisk
  requiresApproval: boolean
  policyChecks: string[]
  reason: string
}

interface PhysicalActionMetadata {
  risk: HarnessRisk
  mutating: boolean
  destructive: boolean
  requiresSpatial: boolean
}

interface PhysicalCapabilityMetadata {
  deviceIds: string[]
  emergencyStopAvailable: boolean
  actions: Record<string, PhysicalActionMetadata>
}

const RISKS = new Set<HarnessRisk>(['low', 'medium', 'high', 'critical'])

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null
  return [...new Set(value)].sort()
}

function actionMetadata(value: unknown): PhysicalActionMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const risk = record['risk']
  if (typeof risk !== 'string' || !RISKS.has(risk as HarnessRisk)) return null
  if (typeof record['mutating'] !== 'boolean') return null
  if (record['destructive'] !== undefined && typeof record['destructive'] !== 'boolean') return null
  if (record['requiresSpatial'] !== undefined && typeof record['requiresSpatial'] !== 'boolean') return null
  return {
    risk: risk as HarnessRisk,
    mutating: record['mutating'],
    destructive: record['destructive'] === true,
    requiresSpatial: record['requiresSpatial'] === true,
  }
}

function physicalMetadata(capability: AiHubCapabilityRef): PhysicalCapabilityMetadata | null {
  const value = capability.metadata?.['physical']
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const deviceIds = stringArray(record['deviceIds'])
  const rawActions = record['actions']
  if (!deviceIds || !rawActions || typeof rawActions !== 'object' || Array.isArray(rawActions)) return null

  const actions: Record<string, PhysicalActionMetadata> = {}
  for (const [name, raw] of Object.entries(rawActions as Record<string, unknown>)) {
    const parsed = actionMetadata(raw)
    if (!parsed) return null
    actions[name] = parsed
  }

  return {
    deviceIds,
    emergencyStopAvailable: record['emergencyStopAvailable'] === true,
    actions,
  }
}

export function planAiHubPhysicalAction(
  workload: AiHubWorkload,
  capability: AiHubCapabilityRef,
  spatial?: AiHubSpatialDecision,
): AiHubPhysicalDecision | null {
  const requirement = workload.requirements.physical
  if (!requirement) return null

  const metadata = physicalMetadata(capability)
  if (!metadata || !metadata.deviceIds.includes(requirement.deviceId)) return null
  const action = metadata.actions[requirement.action]
  if (!action) return null
  if (action.requiresSpatial && !spatial) return null
  if (action.mutating && !metadata.emergencyStopAvailable) return null

  const harness = evaluateHarnessPolicy({
    tool: `physical:${requirement.deviceId}:${requirement.action}`,
    risk: action.risk,
    mutating: action.mutating,
    externalEffect: action.mutating,
    destructive: action.destructive,
  })
  if (harness.decision === 'deny') return null

  const policyChecks = ['physical-capability', 'device-boundary', 'physical-action-scope', 'runtime-harness']
  if (action.requiresSpatial) policyChecks.push('spatial-boundary')
  if (action.mutating) policyChecks.push('emergency-stop')
  if (harness.decision === 'approval') policyChecks.push('operator-approval')

  return {
    deviceId: requirement.deviceId,
    action: requirement.action,
    decision: harness.decision,
    risk: harness.risk,
    requiresApproval: harness.decision === 'approval',
    policyChecks,
    reason: `Blackstar Physical AI verified device ${requirement.deviceId} action ${requirement.action} through capability, safety, Spatial and runtime policy boundaries.`,
  }
}
