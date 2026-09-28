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

export type GoalSignalSource = {
  id: string
  name: string
  objective: string
  status: string
  autonomy_level?: string | null
  trigger_type?: string | null
  budget_pence?: number | null
  last_scheduler_error?: string | null
  scheduler_attempts?: number | null
  trigger_config?: { match?: string | null } | null
}

export type GoalRunSignalSource = {
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

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

export function inferOpportunityKind(goal: GoalSignalSource, latestRun?: GoalRunSignalSource | null): BlackstarOpportunitySignalKind {
  const text = `${goal.name} ${goal.objective}`.toLowerCase()
  const runStatus = String(latestRun?.status ?? '').toLowerCase()
  if (runStatus === 'failed' || runStatus === 'cancelled' || goal.last_scheduler_error?.trim() || latestRun?.error?.trim()) return 'risk'
  if (goal.trigger_type === 'event' || goal.trigger_config?.match?.trim()) return 'customer'
  if ((goal.budget_pence ?? 0) > 0 && /(cost|spend|budget|saving|price)/.test(text)) return 'cost'
  if (/(market|competitor|demand|segment)/.test(text)) return 'market'
  if (/(growth|expand|expansion|launch|acquire|revenue)/.test(text)) return 'growth'
  return 'operations'
}

export function signalsFromGoalPortfolio(goals: GoalSignalSource[], runs: GoalRunSignalSource[]): BlackstarOpportunitySignal[] {
  const latest = new Map<string, GoalRunSignalSource>()
  for (const run of runs) if (run.goal_id && !latest.has(run.goal_id)) latest.set(run.goal_id, run)

  return goals
    .filter((goal) => goal.id.trim() && goal.name.trim() && goal.objective.trim())
    .filter((goal) => !['cancelled', 'completed'].includes(String(goal.status)))
    .map((goal) => {
      const run = latest.get(goal.id)
      const kind = inferOpportunityKind(goal, run)
      const failed = kind === 'risk'
      const budgeted = (goal.budget_pence ?? 0) > 0
      const retries = Number(goal.scheduler_attempts ?? 0)
      return {
        id: goal.id,
        kind,
        title: goal.name.trim().slice(0, 200),
        summary: goal.objective.trim().slice(0, 2000),
        confidence: clamp01(failed ? 0.86 : run ? 0.74 : 0.68),
        impact: clamp01((goal.autonomy_level === 'autonomous' ? 0.18 : 0) + (budgeted ? 0.16 : 0.08) + (failed ? 0.28 : 0.48)),
        urgency: clamp01((failed ? 0.72 : 0.38) + Math.min(0.2, retries * 0.05)),
        evidence: [
          `goal:${goal.id}`,
          `status:${goal.status}`,
          `trigger:${goal.trigger_type || 'manual'}`,
          ...(run?.status ? [`run:${run.status}`] : []),
          ...(goal.last_scheduler_error ? ['scheduler-error'] : []),
          ...(budgeted ? [`budget_pence:${goal.budget_pence}`] : []),
        ],
      }
    })
}

export function buildOwnerCapabilities(
  agents: Array<{ id: string; name: string; org_id?: string | null; allowed_tools?: string[] | null }>,
  workflows: Array<{ id: string; name: string; org_id?: string | null }>,
): AiHubCapabilityRef[] {
  return [
    ...agents.map((agent): AiHubCapabilityRef => ({
      id: agent.id,
      kind: 'agent',
      providerId: 'palladium-agent-runtime',
      name: agent.name,
      capabilities: ['agent-execution', ...((agent.allowed_tools ?? []).map(String).map((value) => value.trim()).filter(Boolean))],
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

function stagesFor(recommendation: BlackstarOpportunityRecommendation, capabilities: AiHubCapabilityRef[]): BlackstarOpportunityExecutionStage[] {
  const catalogue = [...new Set(capabilities.flatMap((capability) => capability.capabilities))]
  const preferred: AiHubCapabilityKind[] = capabilities.some((capability) => capability.kind === 'agent')
    ? ['agent']
    : capabilities.some((capability) => capability.kind === 'workflow') ? ['workflow'] : ['tool']
  const selected = catalogue.includes('agent-execution')
    ? ['agent-execution']
    : catalogue.includes('workflow-execution') ? ['workflow-execution'] : catalogue.slice(0, 1)
  return [{ id: 'review', goal: `Review the governed next action: ${recommendation.recommendedAction}`.slice(0, 2000), capabilities: selected, preferredKinds: preferred }]
}

export function buildOpportunityActionCards(args: {
  tenantId: string
  actorId: string
  goals: GoalSignalSource[]
  runs: GoalRunSignalSource[]
  capabilities: AiHubCapabilityRef[]
  maximumRecommendations?: number
}): OpportunityActionCard[] {
  const recommendations = rankBlackstarOpportunities(signalsFromGoalPortfolio(args.goals, args.runs), {
    maximumRecommendations: args.maximumRecommendations ?? 6,
    minimumConfidence: 0.6,
    minimumScore: 0.55,
  })
  const orchestrator = new AiHubOrchestrator(() => args.capabilities)
  return recommendations.map((recommendation) => {
    const stages = stagesFor(recommendation, args.capabilities)
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
      goalId: recommendation.signalId,
      recommendation,
      plan,
      routingStatus: plan?.status ?? 'unroutable',
    }
  })
}
