import type { AiHubCapabilityRef, AiHubRouteDecision, AiHubWorkload } from './contracts'
import type { AiHubDiscoveryQuery, AiHubDiscoveryResult } from './discovery'
import { discoverAiHubCapabilities } from './discovery'
import type { AiHubPhysicalDecision } from './physical-ai'
import { planAiHubPhysicalAction } from './physical-ai'
import type { AiHubPlacementDecision } from './placement'
import { planAiHubPlacement } from './placement'
import { routeAiHubWorkload } from './router'
import type { AiHubSpatialDecision } from './spatial'
import { planAiHubSpatialContext } from './spatial'

export interface AiHubOrchestrationRequest {
  workload: AiHubWorkload
  discovery?: AiHubDiscoveryQuery
}

export interface AiHubOrchestrationPlan {
  workloadId: string
  discovery: AiHubDiscoveryResult[]
  route: AiHubRouteDecision
  placement: AiHubPlacementDecision
  spatial?: AiHubSpatialDecision
  physical?: AiHubPhysicalDecision
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

    const spatial = request.workload.requirements.spatial
      ? planAiHubSpatialContext(request.workload, route.capability)
      : null
    if (request.workload.requirements.spatial && !spatial) return null

    const physical = request.workload.requirements.physical
      ? planAiHubPhysicalAction(request.workload, route.capability, spatial ?? undefined)
      : null
    if (request.workload.requirements.physical && !physical) return null

    return {
      workloadId: request.workload.id,
      discovery,
      route,
      placement,
      ...(spatial ? { spatial } : {}),
      ...(physical ? { physical } : {}),
      requiresApproval: request.workload.requirements.requireHumanApproval === true || physical?.requiresApproval === true,
      executionBoundary: 'palladium-policy-gateway',
    }
  }
}
