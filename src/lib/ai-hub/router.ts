import type { AiHubCapabilityRef, AiHubRouteDecision, AiHubWorkload } from './contracts'

function satisfiesWorkload(capability: AiHubCapabilityRef, workload: AiHubWorkload) {
  const requirements = workload.requirements
  if (requirements.preferredKinds?.length && !requirements.preferredKinds.includes(capability.kind)) return false
  if (!requirements.capabilities.every((required) => capability.capabilities.includes(required))) return false
  if (requirements.requiredDeploymentTargets?.length && !requirements.requiredDeploymentTargets.some((target) => capability.deploymentTargets.includes(target))) return false
  if (requirements.requiredRegions?.length && !requirements.requiredRegions.some((region) => capability.regions?.includes(region))) return false
  if (requirements.requirePrivateExecution && !capability.deploymentTargets.some((target) => ['customer-cloud', 'on-prem', 'edge', 'device'].includes(target))) return false
  return true
}

export function routeAiHubWorkload(workload: AiHubWorkload, capabilities: AiHubCapabilityRef[]): AiHubRouteDecision | null {
  const eligible = capabilities.filter((capability) => satisfiesWorkload(capability, workload))
  const selected = eligible[0]
  if (!selected) return null

  const policyChecks = ['tenant-isolation', 'capability-match', 'deployment-policy']
  if (workload.requirements.requirePrivateExecution) policyChecks.push('private-execution')
  if (workload.requirements.requireHumanApproval) policyChecks.push('approval-required')

  return {
    workloadId: workload.id,
    capability: selected,
    reason: 'Selected an eligible capability through the Palladium AI Hub policy boundary.',
    policyChecks,
  }
}
