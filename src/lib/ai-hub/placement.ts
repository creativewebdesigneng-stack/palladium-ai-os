import type { AiHubCapabilityRef, AiHubDeploymentTarget, AiHubWorkload } from './contracts'

const PRIVATE_TARGETS = new Set<AiHubDeploymentTarget>(['customer-cloud', 'on-prem', 'edge', 'device'])
const DEFAULT_TARGET_ORDER: readonly AiHubDeploymentTarget[] = [
  'palladium-cloud',
  'provider-cloud',
  'customer-cloud',
  'on-prem',
  'edge',
  'device',
]
const PRIVATE_TARGET_ORDER: readonly AiHubDeploymentTarget[] = ['customer-cloud', 'on-prem', 'edge', 'device']

export interface AiHubPlacementDecision {
  workloadId: string
  capabilityId: string
  deploymentTarget: AiHubDeploymentTarget
  region?: string
  privateExecution: boolean
  reason: string
  policyChecks: string[]
}

function chooseDeploymentTarget(workload: AiHubWorkload, capability: AiHubCapabilityRef) {
  const required = workload.requirements.requiredDeploymentTargets
  const allowed = required?.length
    ? capability.deploymentTargets.filter((target) => required.includes(target))
    : [...capability.deploymentTargets]

  const candidates = workload.requirements.requirePrivateExecution
    ? allowed.filter((target) => PRIVATE_TARGETS.has(target))
    : allowed
  if (!candidates.length) return null

  const order = workload.requirements.requirePrivateExecution ? PRIVATE_TARGET_ORDER : DEFAULT_TARGET_ORDER
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

  return {
    workloadId: workload.id,
    capabilityId: capability.id,
    deploymentTarget,
    ...(region ? { region } : {}),
    privateExecution,
    reason: `Blackstar Agent Cloud placed the workload on ${deploymentTarget}${region ? ` in ${region}` : ''} after deployment, region and private-execution policy checks.`,
    policyChecks,
  }
}
