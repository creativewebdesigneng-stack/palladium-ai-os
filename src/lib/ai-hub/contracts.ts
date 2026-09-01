export const AI_HUB_CAPABILITY_KINDS = [
  'model',
  'agent',
  'tool',
  'mcp',
  'workflow',
  'app',
  'dataset',
  'compute',
  'voice',
  'image',
  'video',
  'embedding',
  'reranker',
] as const

export type AiHubCapabilityKind = (typeof AI_HUB_CAPABILITY_KINDS)[number]

export const AI_HUB_DEPLOYMENT_TARGETS = ['palladium-cloud', 'provider-cloud', 'customer-cloud', 'on-prem', 'edge', 'device'] as const
export type AiHubDeploymentTarget = (typeof AI_HUB_DEPLOYMENT_TARGETS)[number]

export interface AiHubCapabilityRef {
  id: string
  kind: AiHubCapabilityKind
  providerId: string
  name: string
  version?: string
  capabilities: string[]
  deploymentTargets: AiHubDeploymentTarget[]
  regions?: string[]
  estimatedLatencyMs?: number
  estimatedCostMinorUnits?: number
  currency?: string
  metadata?: Record<string, unknown>
}

export interface AiHubWorkloadRequirements {
  capabilities: string[]
  preferredKinds?: AiHubCapabilityKind[]
  maxLatencyMs?: number
  maxCostMinorUnits?: number
  currency?: string
  requiredRegions?: string[]
  requiredDeploymentTargets?: AiHubDeploymentTarget[]
  requirePrivateExecution?: boolean
  requireHumanApproval?: boolean
}

export interface AiHubWorkload {
  id: string
  tenantId: string
  actorId: string
  goal: string
  requirements: AiHubWorkloadRequirements
  context?: Record<string, unknown>
}

export interface AiHubRouteDecision {
  workloadId: string
  capability: AiHubCapabilityRef
  reason: string
  policyChecks: string[]
}
