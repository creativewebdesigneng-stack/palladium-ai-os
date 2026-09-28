import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  buildOpportunityActionCards,
  buildOwnerCapabilities,
  type GoalRunSignalSource,
  type GoalSignalSource,
} from './opportunity-actions'

const inputSchema = z.object({
  maximumRecommendations: z.number().int().min(1).max(8).optional(),
})

export const recommendBlackstarOpportunityActions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const [goalsRes, runsRes, agentsRes, workflowsRes] = await Promise.all([
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

    for (const result of [goalsRes, runsRes, agentsRes, workflowsRes]) {
      if (result.error) throw new Error(result.error.message)
    }

    const capabilities = buildOwnerCapabilities(agentsRes.data ?? [], workflowsRes.data ?? [])
    const cards = buildOpportunityActionCards({
      tenantId: context.userId,
      actorId: context.userId,
      goals: (goalsRes.data ?? []) as GoalSignalSource[],
      runs: (runsRes.data ?? []) as GoalRunSignalSource[],
      capabilities,
      maximumRecommendations: data.maximumRecommendations,
    })

    return {
      engine: 'blackstar_opportunity_planning' as const,
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
        routingStatus: card.routingStatus,
        routedCapabilityIds: card.plan?.intelligence.capabilityIds ?? [],
      })),
    }
  })
