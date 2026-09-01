import type { AiHubCapabilityRef, AiHubRouteDecision, AiHubWorkload } from './contracts'

function satisfiesWorkload(capability: AiHubCapabilityRef, workload: AiHubWorkload) {
  const requirements = workload.requirements
  if (requirements.preferredKinds?.length && !requirements.preferredKinds.includes(capability.kind)) return false
  if (!requirements.capabilities.every((required) => capability.capabilities.includes(required))) return false
  if (requirements.requiredDeploymentTargets?.length && !requirements.requiredDeploymentTargets.some((target) => capability.deploymentTargets.includes(target))) return false
  if (requirements.requiredRegions?.length && !requirements.requiredRegions.some((region) => capability.regions?.includes(region))) return false
  if (requirements.requirePrivateExecution && !capability.deploymentTargets.some((target) => ['customer-cloud', 'on-prem', 'edge', 'device'].includes(target))) return false
  if (requirements.maxLatencyMs != null) {
    if (capability.estimatedLatencyMs == null || capability.estimatedLatencyMs > requirements.maxLatencyMs) return false
  }
  if (requirements.maxCostMinorUnits != null) {
    if (capability.estimatedCostMinorUnits == null || capability.estimatedCostMinorUnits > requirements.maxCostMinorUnits) return false
    if (requirements.currency && capability.currency !== requirements.currency) return false
  }
  return true
}

function scoreCapability(capability: AiHubCapabilityRef) {
  const latency = capability.estimatedLatencyMs ?? Number.POSITIVE_INFINITY
  const cost = capability.estimatedCostMinorUnits ?? Number.POSITIVE_INFINITY
  return { latency, cost }
}

export function routeAiHubWorkload(workload: AiHubWorkload, capabilities: AiHubCapabilityRef[]): AiHubRouteDecision | null {
  const eligible = capabilities.filter((capability) => satisfiesWorkload(capability, workload))
  const selected = eligible
    .map((capability, index) => ({ capability, index, ...scoreCapability(capability) }))
    .sort((a, b) => a.cost - b.cost || a.latency - b.latency || a.index - b.index)[0]?.capability
  if (!selected) return null

  const policyChecks = ['tenant-isolation', 'capability-match', 'deployment-policy']
  if (workload.requirements.requirePrivateExecution) policyChecks.push('private-execution')
  if (workload.requirements.maxLatencyMs != null) policyChecks.push('latency-budget')
  if (workload.requirements.maxCostMinorUnits != null) policyChecks.push('cost-budget')
  if (workload.requirements.requireHumanApproval) policyChecks.push('approval-required')

  return {
    workloadId: workload.id,
    capability: selected,
    reason: 'Selected the lowest-cost eligible capability, then lowest-latency, through the Palladium AI Hub policy boundary.',
    policyChecks,
  }
}
