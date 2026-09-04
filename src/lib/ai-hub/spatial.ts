import type { AiHubCapabilityRef, AiHubWorkload } from './contracts'

export interface AiHubSpatialPosition {
  x: number
  y: number
  z: number
}

export interface AiHubSpatialRequirement {
  sceneId: string
  zoneId?: string
  position?: AiHubSpatialPosition
  maxDistanceFromOrigin?: number
  requiredActions?: string[]
}

export interface AiHubSpatialDecision {
  sceneId: string
  zoneId?: string
  position?: AiHubSpatialPosition
  allowedActions: string[]
  policyChecks: string[]
  reason: string
}

interface SpatialCapabilityMetadata {
  sceneIds: string[]
  zoneIds: string[]
  actions: string[]
}

function finitePosition(position: AiHubSpatialPosition) {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)
}

function distanceFromOrigin(position: AiHubSpatialPosition) {
  return Math.sqrt((position.x ** 2) + (position.y ** 2) + (position.z ** 2))
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null
  return [...new Set(value)].sort()
}

function spatialMetadata(capability: AiHubCapabilityRef): SpatialCapabilityMetadata | null {
  const value = capability.metadata?.['spatial']
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const sceneIds = stringArray(record['sceneIds'])
  const zoneIds = stringArray(record['zoneIds'])
  const actions = stringArray(record['actions'])
  if (!sceneIds || !zoneIds || !actions) return null
  return { sceneIds, zoneIds, actions }
}

export function planAiHubSpatialContext(
  workload: AiHubWorkload,
  capability: AiHubCapabilityRef,
): AiHubSpatialDecision | null {
  const requirement = workload.requirements.spatial
  if (!requirement) return null

  const metadata = spatialMetadata(capability)
  if (!metadata || !metadata.sceneIds.includes(requirement.sceneId)) return null
  if (requirement.zoneId && !metadata.zoneIds.includes(requirement.zoneId)) return null

  if (requirement.position) {
    if (!finitePosition(requirement.position)) return null
    if (requirement.maxDistanceFromOrigin !== undefined) {
      if (!Number.isFinite(requirement.maxDistanceFromOrigin) || requirement.maxDistanceFromOrigin < 0) return null
      if (distanceFromOrigin(requirement.position) > requirement.maxDistanceFromOrigin) return null
    }
  }

  const requiredActions = [...new Set(requirement.requiredActions ?? [])].sort()
  if (requiredActions.some((action) => !metadata.actions.includes(action))) return null

  const policyChecks = ['spatial-capability', 'scene-boundary']
  if (requirement.zoneId) policyChecks.push('zone-boundary')
  if (requirement.position) policyChecks.push('coordinate-boundary')
  if (requiredActions.length) policyChecks.push('spatial-action-scope')

  return {
    sceneId: requirement.sceneId,
    ...(requirement.zoneId ? { zoneId: requirement.zoneId } : {}),
    ...(requirement.position ? { position: requirement.position } : {}),
    allowedActions: requiredActions,
    policyChecks,
    reason: `Blackstar Spatial verified scene ${requirement.sceneId}${requirement.zoneId ? ` / zone ${requirement.zoneId}` : ''} against capability and coordinate boundaries.`,
  }
}
