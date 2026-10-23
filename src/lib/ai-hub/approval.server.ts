import { createHash } from 'node:crypto'
import type { AiHubApprovalGate, AiHubExecutionContext } from './execution'
import type { AiHubOrchestrationPlan } from './orchestrator'

type SupabaseLike = { from: (table: string) => any }

async function privilegedApprovalDb(): Promise<SupabaseLike> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin as unknown as SupabaseLike
}

/**
 * Produce a canonical, bounded representation for approval fingerprinting.
 * Never save raw goals, MCP arguments, or other task input in approval details.
 */
function canonicalApprovalInput(input: unknown): string {
  const visited = new WeakSet<object>()
  const normalise = (value: unknown, depth: number): unknown => {
    if (depth > 20) throw new Error('AI Hub approval input is too deeply nested')
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (Array.isArray(value)) {
      if (visited.has(value)) throw new Error('AI Hub approval input cannot contain cycles')
      if (value.length > 2000) throw new Error('AI Hub approval input is too large')
      visited.add(value)
      const result = value.map((item) => normalise(item, depth + 1))
      visited.delete(value)
      return result
    }
    if (value && typeof value === 'object') {
      if (visited.has(value)) throw new Error('AI Hub approval input cannot contain cycles')
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error('AI Hub approval input must be plain JSON')
      }
      visited.add(value)
      const entries = Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      if (entries.length > 2000) throw new Error('AI Hub approval input is too large')
      const result: Record<string, unknown> = Object.create(null)
      for (const [key, item] of entries) result[key] = normalise(item, depth + 1)
      visited.delete(value)
      return result
    }
    throw new Error('AI Hub approval requires a JSON-serialisable task input')
  }

  const serialised = JSON.stringify(normalise(input, 0))
  if (!serialised || serialised.length > 30000) throw new Error('AI Hub approval input is missing or too large')
  return serialised
}

function approvalDetails(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext) {
  const canonicalInput = canonicalApprovalInput(context.input)
  // The digest is a binding fingerprint, not encryption or a signed attestation.
  // It binds both the decision identity and the exact task input, and is
  // independently recomputed on claim rather than accepted from the client.
  const fingerprint = createHash('sha256').update(JSON.stringify([
    'ai-hub-input-v1', context.actorId, context.tenantId,
    context.approvalOrgId ?? null, plan.workloadId,
    plan.route.capability.providerId, plan.route.capability.id,
    canonicalInput,
  ])).digest('hex')
  return {
    ai_hub_workload_id: plan.workloadId,
    ai_hub_provider_id: plan.route.capability.providerId,
    ai_hub_capability_id: plan.route.capability.id,
    ai_hub_input_fingerprint: fingerprint,
  }
}

export function createAiHubApprovalGate(db: SupabaseLike): AiHubApprovalGate {
  return {
    async request(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext) {
      const details = approvalDetails(plan, context)
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
        .eq('details->>ai_hub_input_fingerprint', details.ai_hub_input_fingerprint)
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
      const details = approvalDetails(plan, context)
      const executionDb = await privilegedApprovalDb()
      let query = executionDb
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
        .eq('details->>ai_hub_input_fingerprint', details.ai_hub_input_fingerprint)
      query = context.approvalOrgId ? query.eq('org_id', context.approvalOrgId) : query.is('org_id', null)
      const { data, error } = await query
        .select('id')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return Boolean(data?.id)
    },

    async complete(approvalRequestId, context, result) {
      const succeeded = result.status === 'completed'
      const executionDb = await privilegedApprovalDb()
      let query = executionDb
        .from('approval_requests')
        .update({
          execution_status: succeeded ? 'succeeded' : 'failed',
          executed_at: new Date().toISOString(),
          execution_error: succeeded ? null : (result.error ?? 'AI Hub execution failed').slice(0, 1000),
          execution_result: succeeded ? { adapter: result.adapter } : { adapter: result.adapter },
        })
        .eq('id', approvalRequestId)
        .eq('user_id', context.actorId)
        .eq('action_type', 'ai_hub_execution')
        .eq('status', 'approved')
        .eq('execution_status', 'executing')
      query = context.approvalOrgId ? query.eq('org_id', context.approvalOrgId) : query.is('org_id', null)
      // Returning from the adapter is not a durable completion receipt. An
      // approval could have been revoked between claim and finalisation.
      // Never report a recorded outcome unless exactly the approved row was
      // updated and returned by the canonical database.
      const { data, error } = await query.select('id').maybeSingle()
      if (error) throw new Error(error.message)
      if (data?.id !== approvalRequestId) {
        throw new Error('AI Hub outcome was not recorded against the approved execution request.')
      }
    },
  }
}
