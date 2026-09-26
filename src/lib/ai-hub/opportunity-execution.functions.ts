import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { createAiHubApprovalGate } from './approval.server'
import {
  AI_HUB_CAPABILITY_KINDS,
  type AiHubCapabilityKind,
  type AiHubCapabilityRef,
} from './contracts'
import { AiHubOrchestrator } from './orchestrator'
import { planBlackstarOpportunityExecution } from './opportunity-execution'
import type { BlackstarOpportunityActionRisk, BlackstarOpportunitySignalKind } from './opportunities'
import {
  buildOpportunityActionCards,
  buildOwnerHubCapabilities,
  type AutonomousGoalSignalSource,
  type AutonomousRunSignalSource,
} from './opportunity-actions'

type StageInput = {
  id: string
  goal: string
  capabilities: string[]
  preferredKinds?: AiHubCapabilityKind[]
  dependsOn?: string[]
}

type OpportunityExecutionInput = {
  id: string
  signalId: string
  kind: BlackstarOpportunitySignalKind
  title: string
  summary: string
  score: number
  confidence: number
  evidence: string[]
  recommendedAction: string
  actionRisk: BlackstarOpportunityActionRisk
  requiresApproval: boolean
  policyChecks: string[]
  stages: StageInput[]
  approved?: boolean
}

const SIGNAL_KINDS = new Set<BlackstarOpportunitySignalKind>([
  'growth', 'cost', 'risk', 'customer', 'operations', 'market',
])
const ACTION_RISKS = new Set<BlackstarOpportunityActionRisk>(['low', 'medium', 'high'])
const CAPABILITY_KINDS = new Set<AiHubCapabilityKind>(AI_HUB_CAPABILITY_KINDS)

function boundedText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function stringList(value: unknown, maxItems = 20, maxLength = 160) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => boundedText(item, maxLength)).filter(Boolean))].slice(0, maxItems)
}

function serializableCapability(capability: AiHubCapabilityRef) {
  return {
    id: capability.id,
    kind: capability.kind,
    providerId: capability.providerId,
    name: capability.name,
    capabilities: capability.capabilities,
    deploymentTargets: capability.deploymentTargets,
    ...(capability.version ? { version: capability.version } : {}),
    ...(capability.regions ? { regions: capability.regions } : {}),
    ...(capability.estimatedLatencyMs !== undefined ? { estimatedLatencyMs: capability.estimatedLatencyMs } : {}),
    ...(capability.estimatedCostMinorUnits !== undefined ? { estimatedCostMinorUnits: capability.estimatedCostMinorUnits } : {}),
    ...(capability.currency ? { currency: capability.currency } : {}),
  }
}

export function validateOpportunityExecutionInput(input: unknown): OpportunityExecutionInput {
  const row = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
  const id = boundedText(row['id'], 120)
  const signalId = boundedText(row['signalId'], 120)
  const kind = boundedText(row['kind'], 40) as BlackstarOpportunitySignalKind
  const title = boundedText(row['title'], 200)
  const summary = boundedText(row['summary'], 2000)
  const recommendedAction = boundedText(row['recommendedAction'], 2000)
  const actionRisk = boundedText(row['actionRisk'], 20) as BlackstarOpportunityActionRisk
  const score = Number(row['score'])
  const confidence = Number(row['confidence'])
  const stagesRaw = Array.isArray(row['stages']) ? row['stages'] : []

  if (!id || !signalId || !title || !summary || !recommendedAction) throw new Error('Opportunity details are incomplete.')
  if (!SIGNAL_KINDS.has(kind)) throw new Error('Opportunity kind is invalid.')
  if (!ACTION_RISKS.has(actionRisk)) throw new Error('Opportunity action risk is invalid.')
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('Opportunity score must be between 0 and 1.')
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Opportunity confidence must be between 0 and 1.')
  if (stagesRaw.length < 1 || stagesRaw.length > 20) throw new Error('Opportunity execution needs between 1 and 20 stages.')

  const stages = stagesRaw.map((value, index): StageInput => {
    const stage = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
    const stageId = boundedText(stage['id'], 120)
    const goal = boundedText(stage['goal'], 2000)
    const capabilities = stringList(stage['capabilities'], 20, 120)
    const preferredKinds = stringList(stage['preferredKinds'], 10, 40)
      .filter((value): value is AiHubCapabilityKind => CAPABILITY_KINDS.has(value as AiHubCapabilityKind))
    const dependsOn = stringList(stage['dependsOn'], 20, 120)
    if (!stageId || !goal || capabilities.length < 1) throw new Error(`Execution stage ${index + 1} is incomplete.`)
    return {
      id: stageId,
      goal,
      capabilities,
      ...(preferredKinds.length ? { preferredKinds } : {}),
      ...(dependsOn.length ? { dependsOn } : {}),
    }
  })

  return {
    id,
    signalId,
    kind,
    title,
    summary,
    score,
    confidence,
    evidence: stringList(row['evidence'], 20, 500),
    recommendedAction,
    actionRisk,
    requiresApproval: row['requiresApproval'] === true,
    policyChecks: stringList(row['policyChecks'], 20, 120),
    stages,
    ...(row['approved'] === true ? { approved: true } : {}),
  }
}

function serializeOpportunityPlan(plan: NonNullable<ReturnType<typeof planBlackstarOpportunityExecution>>) {
  return {
    ...plan,
    intelligence: {
      ...plan.intelligence,
      stages: plan.intelligence.stages.map((stage) => ({
        ...stage,
        plan: {
          ...stage.plan,
          discovery: stage.plan.discovery.map((result) => ({
            ...result,
            capability: serializableCapability(result.capability),
          })),
          route: {
            ...stage.plan.route,
            capability: serializableCapability(stage.plan.route.capability),
          },
        },
      })),
    },
  }
}

async function loadOwnerCapabilities(supabase: { from: (table: string) => any }, userId: string) {
  const [agentsRes, workflowsRes] = await Promise.all([
    supabase
      .from('personal_agents')
      .select('id,name,org_id,allowed_tools,status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(100),
    supabase
      .from('workflows')
      .select('id,name,org_id,status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(100),
  ])
  if (agentsRes.error) throw new Error(agentsRes.error.message)
  if (workflowsRes.error) throw new Error(workflowsRes.error.message)
  return buildOwnerHubCapabilities(agentsRes.data ?? [], workflowsRes.data ?? [])
}

/**
 * Authenticated planning boundary for Blackstar Opportunity Execution. It uses
 * the user's existing active agents/workflows as routable capabilities and
 * derives tenant/actor identity server-side so clients cannot cross tenants.
 */
export const planBlackstarOpportunityExecutionServer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateOpportunityExecutionInput)
  .handler(async ({ data, context }) => {
    const capabilities = await loadOwnerCapabilities(context.supabase, context.userId)
    const orchestrator = new AiHubOrchestrator(() => capabilities)
    const tenantId = context.userId
    const plan = planBlackstarOpportunityExecution({
      id: data.id,
      tenantId,
      actorId: context.userId,
      opportunity: {
        signalId: data.signalId,
        kind: data.kind,
        title: data.title,
        summary: data.summary,
        score: data.score,
        confidence: data.confidence,
        evidence: data.evidence,
        recommendedAction: data.recommendedAction,
        actionRisk: data.actionRisk,
        requiresApproval: data.requiresApproval,
        policyChecks: data.policyChecks,
      },
      stages: data.stages,
      ...(data.approved ? { approved: true } : {}),
    }, orchestrator)

    if (!plan) {
      return {
        status: 'unroutable' as const,
        plan: null,
        availableCapabilities: capabilities.length,
      }
    }

    return {
      status: plan.status,
      plan: serializeOpportunityPlan(plan),
      availableCapabilities: capabilities.length,
    }
  })

const recommendInputSchema = z.object({
  maximumRecommendations: z.number().int().min(1).max(8).optional(),
})

export function validateOpportunityRecommendInput(input: unknown) {
  return recommendInputSchema.parse(input ?? {})
}

/**
 * Rank owner-scoped Autonomous OS goals into recommended actions and plan
 * them against the owner's existing agents/workflows. Listing never executes
 * and never inserts approval rows.
 */
export const recommendBlackstarOpportunityActions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateOpportunityRecommendInput)
  .handler(async ({ data, context }) => {
    const [goalsRes, runsRes, capabilities] = await Promise.all([
      context.supabase
        .from('autonomous_goals')
        .select('id,name,objective,status,autonomy_level,trigger_type,budget_pence,last_scheduler_error,scheduler_attempts,trigger_config')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(50),
      context.supabase
        .from('autonomous_goal_runs')
        .select('goal_id,status,error,created_at')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(100),
      loadOwnerCapabilities(context.supabase, context.userId),
    ])
    if (goalsRes.error) throw new Error(goalsRes.error.message)
    if (runsRes.error) throw new Error(runsRes.error.message)

    const cards = buildOpportunityActionCards({
      tenantId: context.userId,
      actorId: context.userId,
      goals: (goalsRes.data ?? []) as AutonomousGoalSignalSource[],
      runs: (runsRes.data ?? []) as AutonomousRunSignalSource[],
      capabilities,
      maximumRecommendations: data.maximumRecommendations,
    })

    return {
      engine: 'blackstar_opportunity_execution' as const,
      availableCapabilities: capabilities.length,
      actions: cards.map((card) => ({
        goalId: card.goalId,
        title: card.recommendation.title,
        kind: card.recommendation.kind,
        score: card.recommendation.score,
        confidence: card.recommendation.confidence,
        recommendedAction: card.recommendation.recommendedAction,
        actionRisk: card.recommendation.actionRisk,
        requiresApproval: card.recommendation.requiresApproval || Boolean(card.plan?.requiresApproval),
        evidence: card.recommendation.evidence,
        routingStatus: card.routingStatus,
        routedCapabilityIds: card.plan?.intelligence.capabilityIds ?? [],
        policyChecks: card.plan?.policyChecks ?? card.recommendation.policyChecks,
      })),
    }
  })

const approvalInputSchema = z.object({
  goalId: z.string().trim().min(1).max(120),
})

/**
 * Open an existing Mission Control approval_requests row for a planned
 * opportunity that the policy marked as approval-gated. Does not execute.
 */
export const requestBlackstarOpportunityApproval = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => approvalInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [goalRes, capabilities] = await Promise.all([
      context.supabase
        .from('autonomous_goals')
        .select('id,name,objective,status,autonomy_level,trigger_type,budget_pence,last_scheduler_error,scheduler_attempts,trigger_config')
        .eq('user_id', context.userId)
        .eq('id', data.goalId)
        .maybeSingle(),
      loadOwnerCapabilities(context.supabase, context.userId),
    ])
    if (goalRes.error) throw new Error(goalRes.error.message)
    if (!goalRes.data) throw new Error('Autonomous goal not found.')

    const runsRes = await context.supabase
      .from('autonomous_goal_runs')
      .select('goal_id,status,error,created_at')
      .eq('user_id', context.userId)
      .eq('goal_id', data.goalId)
      .order('created_at', { ascending: false })
      .limit(5)
    if (runsRes.error) throw new Error(runsRes.error.message)

    const [card] = buildOpportunityActionCards({
      tenantId: context.userId,
      actorId: context.userId,
      goals: [goalRes.data as AutonomousGoalSignalSource],
      runs: (runsRes.data ?? []) as AutonomousRunSignalSource[],
      capabilities,
      maximumRecommendations: 1,
    })
    if (!card?.plan) {
      return { status: 'unroutable' as const, approvalRequestId: null, recommendedAction: null }
    }
    if (!card.plan.requiresApproval) {
      return {
        status: 'ready' as const,
        approvalRequestId: null,
        recommendedAction: card.plan.recommendedAction,
      }
    }

    const stagePlan = card.plan.intelligence.stages.find((stage) => stage.plan.requiresApproval)?.plan
      ?? card.plan.intelligence.stages[0]?.plan
    if (!stagePlan) {
      return { status: 'unroutable' as const, approvalRequestId: null, recommendedAction: card.plan.recommendedAction }
    }

    const gate = createAiHubApprovalGate(context.supabase)
    const approvalRequestId = await gate.request(stagePlan, {
      tenantId: context.userId,
      actorId: context.userId,
    })
    return {
      status: 'waiting_for_approval' as const,
      approvalRequestId,
      recommendedAction: card.plan.recommendedAction,
    }
  })
