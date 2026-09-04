import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  AI_HUB_CAPABILITY_KINDS,
  type AiHubCapabilityKind,
  type AiHubCapabilityRef,
} from './contracts'
import { AiHubOrchestrator } from './orchestrator'
import { planBlackstarOpportunityExecution } from './opportunity-execution'
import type { BlackstarOpportunityActionRisk, BlackstarOpportunitySignalKind } from './opportunities'

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

/**
 * Authenticated planning boundary for Blackstar Opportunity Execution. It uses
 * the user's existing active agents/workflows as routable capabilities and
 * derives tenant/actor identity server-side so clients cannot cross tenants.
 */
export const planBlackstarOpportunityExecutionServer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateOpportunityExecutionInput)
  .handler(async ({ data, context }) => {
    const [agentsRes, workflowsRes] = await Promise.all([
      context.supabase
        .from('personal_agents')
        .select('id,name,org_id,allowed_tools,status')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .limit(100),
      context.supabase
        .from('workflows')
        .select('id,name,org_id,status')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .limit(100),
    ])
    if (agentsRes.error) throw new Error(agentsRes.error.message)
    if (workflowsRes.error) throw new Error(workflowsRes.error.message)

    const capabilities: AiHubCapabilityRef[] = [
      ...(agentsRes.data ?? []).map((agent): AiHubCapabilityRef => ({
        id: agent.id,
        kind: 'agent',
        providerId: 'palladium-agent-runtime',
        name: agent.name,
        capabilities: ['agent-execution', ...((agent.allowed_tools ?? []) as string[])],
        deploymentTargets: ['palladium-cloud'],
        metadata: { orgId: agent.org_id ?? null },
      })),
      ...(workflowsRes.data ?? []).map((workflow): AiHubCapabilityRef => ({
        id: workflow.id,
        kind: 'workflow',
        providerId: 'palladium-workflows',
        name: workflow.name,
        capabilities: ['workflow-execution'],
        deploymentTargets: ['palladium-cloud'],
        metadata: { orgId: workflow.org_id ?? null },
      })),
    ]

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
      plan,
      availableCapabilities: capabilities.length,
    }
  })
