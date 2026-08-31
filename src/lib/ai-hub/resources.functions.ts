import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  countAiHubResources,
  toAiHubLiveResource,
  type AiHubResourceRecord,
} from './resources'

type AiHubResourceInput = {
  limit: number
}

function validateAiHubResourceInput(input: unknown): AiHubResourceInput {
  const rawLimit =
    input && typeof input === 'object' && 'limit' in input
      ? (input as { limit?: unknown }).limit
      : undefined
  const parsedLimit = Number(rawLimit ?? 100)
  const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 100

  return {
    limit: Math.min(Math.max(Math.trunc(safeLimit), 1), 250),
  }
}

/**
 * Tenant-safe live Hub inventory. Identity comes from the verified bearer token;
 * Supabase RLS remains the source of truth for which resources the caller can see.
 */
export const listAiHubResources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAiHubResourceInput)
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 100
    const [agentsRes, workflowsRes] = await Promise.all([
      context.supabase
        .from('personal_agents')
        .select('id,name,status,model,model_provider,allowed_tools,updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit),
      context.supabase
        .from('workflows')
        .select('id,name,status,updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit),
    ])

    if (agentsRes.error) throw new Error(agentsRes.error.message)
    if (workflowsRes.error) throw new Error(workflowsRes.error.message)

    const resources = [
      ...(agentsRes.data ?? []).map((row) =>
        toAiHubLiveResource(row as unknown as AiHubResourceRecord, 'agent', 'palladium-agent-runtime'),
      ),
      ...(workflowsRes.data ?? []).map((row) =>
        toAiHubLiveResource(row as unknown as AiHubResourceRecord, 'workflow', 'palladium-workflows'),
      ),
    ]

    return {
      resources,
      counts: countAiHubResources(resources),
    }
  })
