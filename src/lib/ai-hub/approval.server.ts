import type { AiHubApprovalGate, AiHubExecutionContext } from './execution'
import type { AiHubOrchestrationPlan } from './orchestrator'

type SupabaseLike = { from: (table: string) => any }

function approvalDetails(plan: AiHubOrchestrationPlan) {
  return {
    ai_hub_workload_id: plan.workloadId,
    ai_hub_provider_id: plan.route.capability.providerId,
    ai_hub_capability_id: plan.route.capability.id,
  }
}

export function createAiHubApprovalGate(db: SupabaseLike): AiHubApprovalGate {
  return {
    async request(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext) {
      const { data, error } = await db
        .from('approval_requests')
        .insert({
          user_id: context.actorId,
          org_id: context.tenantId,
          agent_id: null,
          task_id: null,
          action_type: 'ai_hub_execution',
          title: `${plan.route.capability.name} needs approval`.slice(0, 200),
          summary: 'Approve this Universal AI Hub route before provider execution.'.slice(0, 500),
          details: approvalDetails(plan),
          risk_level: 'medium',
          status: 'pending',
        })
        .select('id')
        .maybeSingle()

      if (error || !data?.id) throw new Error(error?.message ?? 'Could not create AI Hub approval request')
      return data.id as string
    },

    async isApproved(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext, approvalRequestId: string) {
      const details = approvalDetails(plan)
      const { data, error } = await db
        .from('approval_requests')
        .select('id,status')
        .eq('id', approvalRequestId)
        .eq('user_id', context.actorId)
        .eq('org_id', context.tenantId)
        .eq('action_type', 'ai_hub_execution')
        .eq('details->>ai_hub_workload_id', details.ai_hub_workload_id)
        .eq('details->>ai_hub_provider_id', details.ai_hub_provider_id)
        .eq('details->>ai_hub_capability_id', details.ai_hub_capability_id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data?.status === 'approved'
    },
  }
}
