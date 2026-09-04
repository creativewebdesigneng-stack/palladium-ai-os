import type { AiHubCapabilityRef, AiHubRouteDecision, AiHubWorkload } from './contracts'
import type { AiHubDiscoveryQuery, AiHubDiscoveryResult } from './discovery'
import { discoverAiHubCapabilities } from './discovery'
import type { AiHubPlacementDecision } from './placement'
import { planAiHubPlacement } from './placement'
import { routeAiHubWorkload } from './router'

export interface AiHubOrchestrationRequest {
  workload: AiHubWorkload
  discovery?: AiHubDiscoveryQuery
}

export interface AiHubOrchestrationPlan {
  workloadId: string
  discovery: AiHubDiscoveryResult[]
  route: AiHubRouteDecision
  placement: AiHubPlacementDecision
  requiresApproval: boolean
  executionBoundary: 'palladium-policy-gateway'
}

function discoveryFromWorkload(workload: AiHubWorkload): AiHubDiscoveryQuery {
  const requirements = workload.requirements
  const query: AiHubDiscoveryQuery = { capabilities: requirements.capabilities }
  if (requirements.preferredKinds) query.kinds = requirements.preferredKinds
  if (requirements.requiredDeploymentTargets) query.deploymentTargets = requirements.requiredDeploymentTargets
  if (requirements.requiredRegions) query.regions = requirements.requiredRegions
  return query
}

export class AiHubOrchestrator {
  constructor(private readonly capabilities: () => AiHubCapabilityRef[]) {}

  discover(query: AiHubDiscoveryQuery = {}) {
    return discoverAiHubCapabilities(this.capabilities(), query)
  }

  plan(request: AiHubOrchestrationRequest): AiHubOrchestrationPlan | null {
    const discovery = this.discover(request.discovery ?? discoveryFromWorkload(request.workload))

    const route = routeAiHubWorkload(
      request.workload,
      discovery.map((result) => result.capability),
    )
    if (!route) return null

    const placement = planAiHubPlacement(request.workload, route.capability)
    if (!placement) return null

    return {
      workloadId: request.workload.id,
      discovery,
      route,
      placement,
      requiresApproval: request.workload.requirements.requireHumanApproval === true,
      executionBoundary: 'palladium-policy-gateway',
    }
  }
}
