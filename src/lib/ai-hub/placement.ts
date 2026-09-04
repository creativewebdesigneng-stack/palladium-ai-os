import type { AiHubCapabilityRef, AiHubDeploymentTarget, AiHubWorkload } from './contracts'

const PRIVATE_TARGETS = new Set<AiHubDeploymentTarget>(['customer-cloud', 'on-prem', 'edge', 'device'])
const EDGE_TARGETS = new Set<AiHubDeploymentTarget>(['edge', 'device'])
const DEFAULT_TARGET_ORDER: readonly AiHubDeploymentTarget[] = [
  'palladium-cloud',
  'provider-cloud',
  'customer-cloud',
  'on-prem',
  'edge',
  'device',
]
const PRIVATE_TARGET_ORDER: readonly AiHubDeploymentTarget[] = ['customer-cloud', 'on-prem', 'edge', 'device']
const EDGE_TARGET_ORDER: readonly AiHubDeploymentTarget[] = ['edge', 'device']

export interface AiHubPlacementDecision {
  workloadId: string
  capabilityId: string
  deploymentTarget: AiHubDeploymentTarget
  region?: string
  privateExecution: boolean
  reason: string
  policyChecks: string[]
}

function numberMetadata(capability: AiHubCapabilityRef, key: string) {
  const value = capability.metadata?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function edgeCompatible(workload: AiHubWorkload, capability: AiHubCapabilityRef) {
  if (!workload.requirements.requireOfflineExecution && workload.requirements.maxDeviceMemoryMb === undefined) return true
  if (!capability.deploymentTargets.some((target) => EDGE_TARGETS.has(target))) return false
  if (workload.requirements.requireOfflineExecution && capability.metadata?.offlineCapable !== true) return false
  const availableMemory = workload.requirements.maxDeviceMemoryMb
  const requiredMemory = numberMetadata(capability, 'minDeviceMemoryMb')
  if (availableMemory !== undefined) {
    if (!Number.isFinite(availableMemory) || availableMemory < 0) return false
    if (requiredMemory !== null && requiredMemory > availableMemory) return false
  }
  return true
}

function chooseDeploymentTarget(workload: AiHubWorkload, capability: AiHubCapabilityRef) {
  if (!edgeCompatible(workload, capability)) return null
  const required = workload.requirements.requiredDeploymentTargets
  const allowed = required?.length
    ? capability.deploymentTargets.filter((target) => required.includes(target))
    : [...capability.deploymentTargets]

  const edgeRequired = workload.requirements.requireOfflineExecution || workload.requirements.maxDeviceMemoryMb !== undefined
  const candidates = edgeRequired
    ? allowed.filter((target) => EDGE_TARGETS.has(target))
    : workload.requirements.requirePrivateExecution
      ? allowed.filter((target) => PRIVATE_TARGETS.has(target))
      : allowed
  if (!candidates.length) return null

  const order = edgeRequired
    ? EDGE_TARGET_ORDER
    : workload.requirements.requirePrivateExecution
      ? PRIVATE_TARGET_ORDER
      : DEFAULT_TARGET_ORDER
  return [...candidates].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? null
}

function chooseRegion(workload: AiHubWorkload, capability: AiHubCapabilityRef) {
  const capabilityRegions = capability.regions ?? []
  const required = workload.requirements.requiredRegions
  if (required?.length) return required.find((region) => capabilityRegions.includes(region)) ?? null
  return capabilityRegions[0] ?? null
}

export function planAiHubPlacement(workload: AiHubWorkload, capability: AiHubCapabilityRef): AiHubPlacementDecision | null {
  const deploymentTarget = chooseDeploymentTarget(workload, capability)
  if (!deploymentTarget) return null

  const region = chooseRegion(workload, capability)
  if (workload.requirements.requiredRegions?.length && !region) return null

  const privateExecution = PRIVATE_TARGETS.has(deploymentTarget)
  const policyChecks = ['tenant-isolation', 'capability-placement', 'deployment-target']
  if (region) policyChecks.push('region-placement')
  if (workload.requirements.requirePrivateExecution) policyChecks.push('private-execution')
  if (workload.requirements.requireOfflineExecution) policyChecks.push('offline-capability')
  if (workload.requirements.maxDeviceMemoryMb !== undefined) policyChecks.push('device-memory')
  if (EDGE_TARGETS.has(deploymentTarget)) policyChecks.push('edge-placement')

  return {
    workloadId: workload.id,
    capabilityId: capability.id,
    deploymentTarget,
    ...(region ? { region } : {}),
    privateExecution,
    reason: `Blackstar Agent Cloud placed the workload on ${deploymentTarget}${region ? ` in ${region}` : ''} after deployment, region, privacy and edge policy checks.`,
    policyChecks,
  }
}
