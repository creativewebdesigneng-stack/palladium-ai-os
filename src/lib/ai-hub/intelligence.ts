import type { AiHubCapabilityKind, AiHubWorkloadRequirements } from './contracts'
import type { AiHubOrchestrationPlan } from './orchestrator'
import { AiHubOrchestrator } from './orchestrator'

export interface BlackstarIntelligenceNeed {
  id: string
  goal: string
  capabilities: string[]
  preferredKinds?: AiHubCapabilityKind[]
  requirements?: Omit<AiHubWorkloadRequirements, 'capabilities' | 'preferredKinds'>
  dependsOn?: string[]
}

export interface BlackstarIntelligenceGoal {
  id: string
  tenantId: string
  actorId: string
  goal: string
  needs: BlackstarIntelligenceNeed[]
}

export interface BlackstarIntelligenceStage {
  id: string
  goal: string
  dependsOn: string[]
  plan: AiHubOrchestrationPlan
}

export interface BlackstarIntelligencePlan {
  goalId: string
  goal: string
  stages: BlackstarIntelligenceStage[]
  capabilityIds: string[]
  providerIds: string[]
  deploymentTargets: string[]
  requiresApproval: boolean
  policyChecks: string[]
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort()
}

function validNeed(need: BlackstarIntelligenceNeed) {
  return Boolean(
    need.id.trim()
    && need.goal.trim()
    && need.capabilities.length
    && need.capabilities.every((capability) => capability.trim()),
  )
}

export function planBlackstarIntelligence(
  goal: BlackstarIntelligenceGoal,
  orchestrator: AiHubOrchestrator,
): BlackstarIntelligencePlan | null {
  if (!goal.id.trim() || !goal.tenantId.trim() || !goal.actorId.trim() || !goal.goal.trim()) return null
  if (!goal.needs.length || goal.needs.length > 20 || goal.needs.some((need) => !validNeed(need))) return null

  const ids = goal.needs.map((need) => need.id)
  if (new Set(ids).size !== ids.length) return null

  const completed = new Set<string>()
  const stages: BlackstarIntelligenceStage[] = []

  for (const need of goal.needs) {
    const dependsOn = uniqueSorted(need.dependsOn ?? [])
    if (dependsOn.some((dependency) => !completed.has(dependency))) return null

    const requirements: AiHubWorkloadRequirements = {
      capabilities: uniqueSorted(need.capabilities),
      ...(need.preferredKinds?.length ? { preferredKinds: [...new Set(need.preferredKinds)] } : {}),
      ...(need.requirements ?? {}),
    }

    const plan = orchestrator.plan({
      workload: {
        id: `${goal.id}:${need.id}`,
        tenantId: goal.tenantId,
        actorId: goal.actorId,
        goal: need.goal,
        requirements,
        context: {
          intelligenceGoalId: goal.id,
          intelligenceStageId: need.id,
          dependsOn,
        },
      },
    })
    if (!plan) return null

    stages.push({ id: need.id, goal: need.goal, dependsOn, plan })
    completed.add(need.id)
  }

  return {
    goalId: goal.id,
    goal: goal.goal,
    stages,
    capabilityIds: uniqueSorted(stages.map((stage) => stage.plan.route.capability.id)),
    providerIds: uniqueSorted(stages.map((stage) => stage.plan.route.capability.providerId)),
    deploymentTargets: uniqueSorted(stages.map((stage) => stage.plan.placement.deploymentTarget)),
    requiresApproval: stages.some((stage) => stage.plan.requiresApproval),
    policyChecks: [
      'goal-boundary',
      'dependency-order',
      'capability-discovery',
      'intelligence-routing',
      'governed-placement',
      'approval-propagation',
    ],
  }
}
