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
      const details = approvalDetails(plan)
      let existingQuery = db
        .from('approval_requests')
        .select('id')
        .eq('user_id', context.actorId)
        .eq('action_type', 'ai_hub_execution')
        .in('status', ['pending', 'approved'])
        .is('execution_status', null)
        .eq('details->>ai_hub_workload_id', details.ai_hub_workload_id)
        .eq('details->>ai_hub_provider_id', details.ai_hub_provider_id)
        .eq('details->>ai_hub_capability_id', details.ai_hub_capability_id)
      existingQuery = context.approvalOrgId ? existingQuery.eq('org_id', context.approvalOrgId) : existingQuery.is('org_id', null)
      const { data: existing, error: existingError } = await existingQuery.maybeSingle()
      if (existingError) throw new Error(existingError.message)
      if (existing?.id) return existing.id as string

      const { data, error } = await db
        .from('approval_requests')
        .insert({
          user_id: context.actorId,
          org_id: context.approvalOrgId ?? null,
          agent_id: null,
          task_id: null,
          action_type: 'ai_hub_execution',
          title: `${plan.route.capability.name} needs approval`.slice(0, 200),
          summary: 'Approve this Universal AI Hub route before provider execution.'.slice(0, 500),
          details,
          risk_level: 'medium',
          status: 'pending',
        })
        .select('id')
        .maybeSingle()

      if (error || !data?.id) throw new Error(error?.message ?? 'Could not create AI Hub approval request')
      return data.id as string
    },

    async claim(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext, approvalRequestId: string) {
      const details = approvalDetails(plan)
      let query = db
        .from('approval_requests')
        .update({ execution_status: 'executing', execution_error: null, execution_result: null })
        .eq('id', approvalRequestId)
        .eq('user_id', context.actorId)
        .eq('action_type', 'ai_hub_execution')
        .eq('status', 'approved')
        .is('execution_status', null)
        .eq('details->>ai_hub_workload_id', details.ai_hub_workload_id)
        .eq('details->>ai_hub_provider_id', details.ai_hub_provider_id)
        .eq('details->>ai_hub_capability_id', details.ai_hub_capability_id)
      query = context.approvalOrgId ? query.eq('org_id', context.approvalOrgId) : query.is('org_id', null)
      const { data, error } = await query
        .select('id')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return Boolean(data?.id)
    },

    async complete(approvalRequestId, context, result) {
      const succeeded = result.status === 'completed'
      let query = db
        .from('approval_requests')
        .update({
          execution_status: succeeded ? 'succeeded' : 'failed',
          executed_at: new Date().toISOString(),
          execution_error: succeeded ? null : (result.error ?? 'AI Hub execution failed').slice(0, 1000),
          execution_result: succeeded ? { adapter: result.adapter } : { adapter: result.adapter },
        })
        .eq('id', approvalRequestId)
        .eq('user_id', context.actorId)
        .eq('status', 'approved')
        .eq('execution_status', 'executing')
      query = context.approvalOrgId ? query.eq('org_id', context.approvalOrgId) : query.is('org_id', null)
      const { error } = await query
      if (error) throw new Error(error.message)
    },
  }
}
