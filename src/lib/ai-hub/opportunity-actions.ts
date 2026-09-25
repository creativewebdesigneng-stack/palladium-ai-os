import type { AiHubCapabilityKind, AiHubCapabilityRef } from './contracts'
import { AiHubOrchestrator } from './orchestrator'
import {
  rankBlackstarOpportunities,
  type BlackstarOpportunityRecommendation,
  type BlackstarOpportunitySignal,
  type BlackstarOpportunitySignalKind,
} from './opportunities'
import {
  planBlackstarOpportunityExecution,
  type BlackstarOpportunityExecutionPlan,
  type BlackstarOpportunityExecutionStage,
} from './opportunity-execution'

export type AutonomousGoalSignalSource = {
  id: string
  name: string
  objective: string
  status: string
  autonomy_level?: string | null
  trigger_type?: string | null
  budget_pence?: number | null
  last_scheduler_error?: string | null
  scheduler_attempts?: number | null
  trigger_config?: { match?: string | null; source?: string | null } | null
  event_match?: string | null
}

export type AutonomousRunSignalSource = {
  goal_id: string
  status?: string | null
  error?: string | null
}

export type OpportunityActionCard = {
  goalId: string
  recommendation: BlackstarOpportunityRecommendation
  plan: BlackstarOpportunityExecutionPlan | null
  routingStatus: 'ready' | 'waiting_for_approval' | 'unroutable'
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function haystack(goal: AutonomousGoalSignalSource) {
  return `${goal.name} ${goal.objective}`.toLowerCase()
}

export function inferOpportunityKind(
  goal: AutonomousGoalSignalSource,
  latestRun?: AutonomousRunSignalSource | null,
): BlackstarOpportunitySignalKind {
  const text = haystack(goal)
  const runStatus = String(latestRun?.status ?? '').toLowerCase()
  if (
    runStatus === 'failed'
    || runStatus === 'cancelled'
    || Boolean(goal.last_scheduler_error?.trim())
    || Boolean(latestRun?.error?.trim())
  ) {
    return 'risk'
  }
  if (goal.trigger_type === 'event' || Boolean(goal.event_match?.trim()) || Boolean(goal.trigger_config?.match?.trim())) {
    return 'customer'
  }
  if ((goal.budget_pence ?? 0) > 0 && /(cost|spend|budget|saving|price)/.test(text)) return 'cost'
  if (/(market|competitor|demand|segment)/.test(text)) return 'market'
  if (/(growth|expand|expansion|launch|acquire|revenue)/.test(text)) return 'growth'
  return 'operations'
}

export function signalsFromAutonomousPortfolio(
  goals: AutonomousGoalSignalSource[],
  runs: AutonomousRunSignalSource[],
): BlackstarOpportunitySignal[] {
  const latestByGoal = new Map<string, AutonomousRunSignalSource>()
  for (const run of runs) {
    if (!run.goal_id || latestByGoal.has(run.goal_id)) continue
    latestByGoal.set(run.goal_id, run)
  }

  return goals
    .filter((goal) => goal.id.trim() && goal.name.trim() && goal.objective.trim())
    .filter((goal) => !['cancelled', 'completed'].includes(String(goal.status)))
    .map((goal) => {
      const latestRun = latestByGoal.get(goal.id)
      const kind = inferOpportunityKind(goal, latestRun)
      const failed = kind === 'risk'
      const autonomous = goal.autonomy_level === 'autonomous'
      const budgeted = (goal.budget_pence ?? 0) > 0
      const retries = Number(goal.scheduler_attempts ?? 0)
      const evidence = [
        `goal:${goal.id}`,
        `status:${goal.status}`,
        `trigger:${goal.trigger_type || 'manual'}`,
        ...(latestRun?.status ? [`run:${latestRun.status}`] : []),
        ...(goal.last_scheduler_error ? ['scheduler-error'] : []),
        ...(budgeted ? [`budget_pence:${goal.budget_pence}`] : []),
      ]

      return {
        id: goal.id,
        kind,
        title: goal.name.trim().slice(0, 200),
        summary: goal.objective.trim().slice(0, 2000),
        confidence: clamp01(failed ? 0.86 : latestRun ? 0.74 : 0.68),
        impact: clamp01((autonomous ? 0.18 : 0) + (budgeted ? 0.16 : 0.08) + (failed ? 0.28 : 0.42)),
        urgency: clamp01((failed ? 0.72 : 0.38) + Math.min(0.2, retries * 0.05)),
        evidence,
      } satisfies BlackstarOpportunitySignal
    })
}

export function buildOwnerHubCapabilities(
  agents: Array<{ id: string; name: string; org_id?: string | null; allowed_tools?: string[] | null }>,
  workflows: Array<{ id: string; name: string; org_id?: string | null }>,
): AiHubCapabilityRef[] {
  return [
    ...agents.map((agent): AiHubCapabilityRef => ({
      id: agent.id,
      kind: 'agent',
      providerId: 'palladium-agent-runtime',
      name: agent.name,
      capabilities: ['agent-execution', ...((agent.allowed_tools ?? []).map((tool) => String(tool).trim()).filter(Boolean))],
      deploymentTargets: ['palladium-cloud'],
      metadata: { orgId: agent.org_id ?? null },
    })),
    ...workflows.map((workflow): AiHubCapabilityRef => ({
      id: workflow.id,
      kind: 'workflow',
      providerId: 'palladium-workflows',
      name: workflow.name,
      capabilities: ['workflow-execution'],
      deploymentTargets: ['palladium-cloud'],
      metadata: { orgId: workflow.org_id ?? null },
    })),
  ]
}

export function executionStagesForOpportunity(
  recommendation: BlackstarOpportunityRecommendation,
  capabilities: AiHubCapabilityRef[],
): BlackstarOpportunityExecutionStage[] {
  const catalogue = [...new Set(capabilities.flatMap((capability) => capability.capabilities))]
  const preferred: AiHubCapabilityKind[] = capabilities.some((capability) => capability.kind === 'agent')
    ? ['agent']
    : capabilities.some((capability) => capability.kind === 'workflow')
      ? ['workflow']
      : ['tool']
  const reviewCapabilities = catalogue.includes('agent-execution')
    ? ['agent-execution']
    : catalogue.includes('workflow-execution')
      ? ['workflow-execution']
      : catalogue.slice(0, 1)

  const stages: BlackstarOpportunityExecutionStage[] = [
    {
      id: 'review',
      goal: `Review the governed next action: ${recommendation.recommendedAction}`.slice(0, 2000),
      capabilities: reviewCapabilities,
      preferredKinds: preferred,
    },
  ]

  if (catalogue.includes('workflow-execution') && reviewCapabilities[0] !== 'workflow-execution') {
    stages.push({
      id: 'route-workflow',
      goal: 'Route the approved next action through an existing owner workflow when one is available.',
      capabilities: ['workflow-execution'],
      preferredKinds: ['workflow'],
      dependsOn: ['review'],
    })
  }

  return stages
}

export function buildOpportunityActionCards(args: {
  tenantId: string
  actorId: string
  goals: AutonomousGoalSignalSource[]
  runs: AutonomousRunSignalSource[]
  capabilities: AiHubCapabilityRef[]
  maximumRecommendations?: number
}): OpportunityActionCard[] {
  const recommendations = rankBlackstarOpportunities(
    signalsFromAutonomousPortfolio(args.goals, args.runs),
    { maximumRecommendations: args.maximumRecommendations ?? 8, minimumConfidence: 0.6, minimumScore: 0.55 },
  )
  const orchestrator = new AiHubOrchestrator(() => args.capabilities)
  const goalsById = new Map(args.goals.map((goal) => [goal.id, goal]))

  return recommendations.map((recommendation) => {
    const stages = executionStagesForOpportunity(recommendation, args.capabilities)
    const plan = stages.every((stage) => stage.capabilities.length > 0)
      ? planBlackstarOpportunityExecution({
          id: `opp-exec:${recommendation.signalId}`,
          tenantId: args.tenantId,
          actorId: args.actorId,
          opportunity: recommendation,
          stages,
        }, orchestrator)
      : null
    return {
      goalId: goalsById.get(recommendation.signalId)?.id ?? recommendation.signalId,
      recommendation,
      plan,
      routingStatus: plan?.status ?? 'unroutable',
    }
  })
}
