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

export const AI_HUB_ROUTING_OBJECTIVES = ['balanced', 'lowest-cost', 'lowest-latency', 'highest-reliability', 'highest-quality'] as const
export type AiHubRoutingObjective = (typeof AI_HUB_ROUTING_OBJECTIVES)[number]

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

/**
 * Optional planning policy. Historical task success is a heuristic, never calibrated
 * certainty or permission to bypass Blackstar's execution/approval gateways.
 */
/**
 * Structured prompt assessment for planning. Its declared source alone is
 * not authentication; runtime use requires authoritative server verification.
 */
export interface AiHubPromptAssessment {
  relevance: 'relevant' | 'irrelevant' | 'unknown'
  grounding: 'grounded' | 'ungrounded' | 'unknown'
  ambiguity: 'clear' | 'ambiguous' | 'unknown'
  approval: 'required' | 'not-required' | 'unknown'
  source: 'blackstar-policy-verifier' | 'unverified'
  evidenceIds?: string[]
}

export interface AiHubEvidenceRoutingPolicy {
  mode: 'evidence-gated'
  minObservedRuns?: number
  minReliability?: number
  promptAssessment?: AiHubPromptAssessment
}

/** Decision *plan* evidence; this is not an execution or audit receipt. */
export interface AiHubDecisionTrace {
  status: 'planned-not-executed'
  lane: 'deterministic' | 'model-escalation' | 'approval-required'
  consideredCapabilityIds: string[]
  selectedCapabilityId: string
  observedRuns: number
  reliabilityScore: number
  evaluationCount: number
  thresholds: { minObservedRuns: number; minReliability: number }
  reasons: string[]
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
  routingObjective?: AiHubRoutingObjective
  /** Opt-in evidence routing. Existing routing remains the default. */
  evidenceRouting?: AiHubEvidenceRoutingPolicy
  /** Require a capability explicitly marked as offline-capable and place it on edge/device. */
  requireOfflineExecution?: boolean
  /** Maximum device memory available to the workload. Capability metadata may declare minDeviceMemoryMb. */
  maxDeviceMemoryMb?: number
  /** Optional governed Spatial scene, zone, coordinate and action boundary. */
  spatial?: import('./spatial').AiHubSpatialRequirement
  /** Optional governed Physical AI device/action request. */
  physical?: import('./physical-ai').AiHubPhysicalRequirement
}

export interface AiHubWorkload {
  id: string
  tenantId: string
  actorId: string
  goal: string
  requirements: AiHubWorkloadRequirements
  context?: Record<string, unknown>
}

export interface AiHubRoutingSignals {
  objective: AiHubRoutingObjective
  score: number
  costScore: number
  latencyScore: number
  reliabilityScore: number
  qualityScore: number
  observedRuns: number
  evaluationCount: number
}

export interface AiHubRouteDecision {
  workloadId: string
  capability: AiHubCapabilityRef
  reason: string
  policyChecks: string[]
  routingSignals?: AiHubRoutingSignals
  decisionTrace?: AiHubDecisionTrace
}
