import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { createAiHubApprovalGate } from './approval.server'
import {
  buildOpportunityActionCards,
  buildOwnerCapabilities,
  type GoalRunSignalSource,
  type GoalSignalSource,
} from './opportunity-actions'

const inputSchema = z.object({
  goalId: z.string().trim().min(1).max(120),
})

export const requestBlackstarOpportunityApproval = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [goalRes, runsRes, agentsRes, workflowsRes] = await Promise.all([
      context.supabase
        .from('autonomous_goals')
        .select('id,name,objective,status,autonomy_level,trigger_type,budget_pence,last_scheduler_error,scheduler_attempts,trigger_config')
        .eq('user_id', context.userId)
        .eq('id', data.goalId)
        .maybeSingle(),
      context.supabase
        .from('autonomous_goal_runs')
        .select('goal_id,status,error,created_at')
        .eq('user_id', context.userId)
        .eq('goal_id', data.goalId)
        .order('created_at', { ascending: false })
        .limit(5),
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

    for (const result of [goalRes, runsRes, agentsRes, workflowsRes]) {
      if (result.error) throw new Error(result.error.message)
    }
    if (!goalRes.data) throw new Error('Autonomous goal not found.')

    const capabilities = buildOwnerCapabilities(agentsRes.data ?? [], workflowsRes.data ?? [])
    const [card] = buildOpportunityActionCards({
      tenantId: context.userId,
      actorId: context.userId,
      goals: [goalRes.data as GoalSignalSource],
      runs: (runsRes.data ?? []) as GoalRunSignalSource[],
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

    const stage = card.plan.intelligence.stages.find((item) => item.plan.requiresApproval)
      ?? card.plan.intelligence.stages[0]
    if (!stage) {
      return {
        status: 'unroutable' as const,
        approvalRequestId: null,
        recommendedAction: card.plan.recommendedAction,
      }
    }

    const rawOrgId = stage.plan.route.capability.metadata?.['orgId']
    const approvalOrgId = typeof rawOrgId === 'string' && rawOrgId.trim() ? rawOrgId : null
    const gate = createAiHubApprovalGate(context.supabase)
    const approvalRequestId = await gate.request(stage.plan, {
      tenantId: context.userId,
      actorId: context.userId,
      approvalOrgId,
    })

    return {
      status: 'waiting_for_approval' as const,
      approvalRequestId,
      recommendedAction: card.plan.recommendedAction,
    }
  })
