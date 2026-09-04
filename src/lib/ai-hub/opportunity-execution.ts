import type { AiHubCapabilityKind, AiHubWorkloadRequirements } from './contracts'
import type { AiHubOrchestrator } from './orchestrator'
import type { BlackstarIntelligencePlan } from './intelligence'
import { planBlackstarIntelligence } from './intelligence'
import type { BlackstarOpportunityRecommendation } from './opportunities'

export interface BlackstarOpportunityExecutionStage {
  id: string
  goal: string
  capabilities: string[]
  preferredKinds?: AiHubCapabilityKind[]
  requirements?: Omit<AiHubWorkloadRequirements, 'capabilities' | 'preferredKinds'>
  dependsOn?: string[]
}

export interface BlackstarOpportunityExecutionRequest {
  id: string
  tenantId: string
  actorId: string
  opportunity: BlackstarOpportunityRecommendation
  stages: BlackstarOpportunityExecutionStage[]
  approved?: boolean
}

export interface BlackstarOpportunityExecutionPlan {
  id: string
  signalId: string
  opportunityScore: number
  opportunityConfidence: number
  recommendedAction: string
  status: 'ready' | 'waiting_for_approval'
  requiresApproval: boolean
  provenance: string[]
  intelligence: BlackstarIntelligencePlan
  policyChecks: string[]
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function validRequest(request: BlackstarOpportunityExecutionRequest) {
  if (!request.id.trim() || !request.tenantId.trim() || !request.actorId.trim()) return false
  if (!request.opportunity.signalId.trim() || !request.opportunity.recommendedAction.trim()) return false
  if (!Number.isFinite(request.opportunity.score) || request.opportunity.score < 0 || request.opportunity.score > 1) return false
  if (!Number.isFinite(request.opportunity.confidence) || request.opportunity.confidence < 0 || request.opportunity.confidence > 1) return false
  if (!request.stages.length || request.stages.length > 20) return false
  return request.stages.every((stage) => stage.id.trim() && stage.goal.trim() && stage.capabilities.length > 0)
}

export function planBlackstarOpportunityExecution(
  request: BlackstarOpportunityExecutionRequest,
  orchestrator: AiHubOrchestrator,
): BlackstarOpportunityExecutionPlan | null {
  if (!validRequest(request)) return null

  const intelligence = planBlackstarIntelligence({
    id: request.id,
    tenantId: request.tenantId,
    actorId: request.actorId,
    goal: request.opportunity.recommendedAction,
    needs: request.stages.map((stage) => ({
      id: stage.id,
      goal: stage.goal,
      capabilities: unique(stage.capabilities),
      ...(stage.preferredKinds?.length ? { preferredKinds: [...new Set(stage.preferredKinds)] } : {}),
      ...(stage.requirements ? { requirements: stage.requirements } : {}),
      ...(stage.dependsOn?.length ? { dependsOn: unique(stage.dependsOn) } : {}),
    })),
  }, orchestrator)
  if (!intelligence) return null

  const requiresApproval = request.opportunity.requiresApproval || intelligence.requiresApproval
  const approved = request.approved === true

  return {
    id: request.id,
    signalId: request.opportunity.signalId,
    opportunityScore: request.opportunity.score,
    opportunityConfidence: request.opportunity.confidence,
    recommendedAction: request.opportunity.recommendedAction,
    status: requiresApproval && !approved ? 'waiting_for_approval' : 'ready',
    requiresApproval,
    provenance: unique([
      `opportunity:${request.opportunity.signalId}`,
      ...request.opportunity.evidence.map((evidence) => `evidence:${evidence}`),
    ]),
    intelligence,
    policyChecks: [
      ...request.opportunity.policyChecks,
      'opportunity-provenance',
      'tenant-actor-boundary',
      'goal-compilation',
      'capability-routing',
      'approval-propagation',
    ],
  }
}
