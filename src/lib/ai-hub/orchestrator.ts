import type { AiHubCapabilityRef, AiHubRouteDecision, AiHubWorkload } from './contracts'
import type { AiHubDiscoveryQuery, AiHubDiscoveryResult } from './discovery'
import { discoverAiHubCapabilities } from './discovery'
import { routeAiHubWorkload } from './router'

export interface AiHubOrchestrationRequest {
  workload: AiHubWorkload
  discovery?: AiHubDiscoveryQuery
}

export interface AiHubOrchestrationPlan {
  workloadId: string
  discovery: AiHubDiscoveryResult[]
  route: AiHubRouteDecision
  requiresApproval: boolean
  executionBoundary: 'palladium-policy-gateway'
}

export class AiHubOrchestrator {
  constructor(private readonly capabilities: () => AiHubCapabilityRef[]) {}

  discover(query: AiHubDiscoveryQuery = {}) {
    return discoverAiHubCapabilities(this.capabilities(), query)
  }

  plan(request: AiHubOrchestrationRequest): AiHubOrchestrationPlan | null {
    const discovery = this.discover(request.discovery ?? {
      capabilities: request.workload.requirements.capabilities,
      kinds: request.workload.requirements.preferredKinds,
      deploymentTargets: request.workload.requirements.requiredDeploymentTargets,
      regions: request.workload.requirements.requiredRegions,
    })

    const route = routeAiHubWorkload(
      request.workload,
      discovery.map((result) => result.capability),
    )
    if (!route) return null

    return {
      workloadId: request.workload.id,
      discovery,
      route,
      requiresApproval: request.workload.requirements.requireHumanApproval === true,
      executionBoundary: 'palladium-policy-gateway',
    }
  }
}
