import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS } from '@/lib/mcp/catalog'
import {
  isModelProviderConfigured,
  listModelProviderDefinitions,
} from '@/lib/runtime/model-providers.server'
import {
  countAiHubResources,
  toAiHubExternalMcpResources,
  toAiHubLiveResource,
  toAiHubMarketplaceAgentResource,
  toAiHubMcpResources,
  toAiHubSkillResource,
  type AiHubLiveResource,
  type AiHubResourceRecord,
} from './resources'

type AiHubResourceInput = { limit: number }

function validateAiHubResourceInput(input: unknown): AiHubResourceInput {
  const rawLimit = input && typeof input === 'object' && 'limit' in input
    ? (input as { limit?: unknown }).limit
    : undefined
  const parsedLimit = Number(rawLimit ?? 100)
  const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 100
  return { limit: Math.min(Math.max(Math.trunc(safeLimit), 1), 250) }
}

function listModelResources(): AiHubLiveResource[] {
  return listModelProviderDefinitions().map((provider) => {
    const configured = isModelProviderConfigured(provider.id)
    return {
      id: `${provider.id}:${provider.defaultModel}`,
      kind: 'model',
      name: `${provider.name} · ${provider.defaultModel}`,
      status: configured ? 'available' : 'unconfigured',
      providerId: 'palladium-model-gateway',
      capabilities: ['model-inference'],
      metadata: {
        modelProvider: provider.id,
        model: provider.defaultModel,
        configured: String(configured),
        ...(provider.integrations?.length ? { integrations: provider.integrations.join(', ') } : {}),
      },
    }
  })
}

/** Tenant-safe live Hub inventory projected from existing authoritative systems. */
export const listAiHubResources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAiHubResourceInput)
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 100
    // These tables post-date the checked-in generated schema. Reuse the same
    // authenticated client so existing RLS remains authoritative.
    const untypedClient = context.supabase as unknown as SupabaseClient
    const [agentsRes, workflowsRes, skillsRes, externalMcpRes, marketplaceRes] = await Promise.all([
      context.supabase.from('personal_agents')
        .select('id,name,status,model,model_provider,allowed_tools,updated_at')
        .order('updated_at', { ascending: false }).limit(limit),
      context.supabase.from('workflows')
        .select('id,name,status,updated_at')
        .order('updated_at', { ascending: false }).limit(limit),
      untypedClient.from('agent_skills')
        .select('id,name,description,version,requires_tools,requires_scripts,dangerous,scan_verdict,source_kind,enabled,updated_at')
        .order('updated_at', { ascending: false }).limit(limit),
      untypedClient.from('external_mcp_servers')
        .select('id,name,slug,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,updated_at')
        .order('updated_at', { ascending: false }).limit(limit),
      untypedClient.from('marketplace_agents')
        .select('id,title,summary,description,category,tags,price_pence,currency,version,required_plan,install_count,rating_avg,rating_count,published_at,updated_at')
        .eq('status', 'published')
        .order('install_count', { ascending: false }).limit(limit),
    ])

    if (agentsRes.error) throw new Error(agentsRes.error.message)
    if (workflowsRes.error) throw new Error(workflowsRes.error.message)
    if (skillsRes.error) throw new Error(skillsRes.error.message)
    if (externalMcpRes.error) throw new Error(externalMcpRes.error.message)
    if (marketplaceRes.error) throw new Error(marketplaceRes.error.message)

    const resources: AiHubLiveResource[] = [
      ...listModelResources(),
      ...toAiHubMcpResources(PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS),
      ...(externalMcpRes.data ?? []).flatMap((row) =>
        toAiHubExternalMcpResources(row as unknown as AiHubResourceRecord)),
      ...(agentsRes.data ?? []).map((row) =>
        toAiHubLiveResource(row as unknown as AiHubResourceRecord, 'agent', 'palladium-agent-runtime')),
      ...(skillsRes.data ?? []).map((row) =>
        toAiHubSkillResource(row as unknown as AiHubResourceRecord)),
      ...(marketplaceRes.data ?? []).map((row) =>
        toAiHubMarketplaceAgentResource(row as unknown as AiHubResourceRecord)),
      ...(workflowsRes.data ?? []).map((row) =>
        toAiHubLiveResource(row as unknown as AiHubResourceRecord, 'workflow', 'palladium-workflows')),
    ]

    return { resources, counts: countAiHubResources(resources) }
  })
