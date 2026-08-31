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
  toAiHubMcpResources,
  type AiHubLiveResource,
  type AiHubResourceRecord,
} from './resources'

type AiHubResourceInput = {
  limit: number
}

type McpDb = {
  from: (table: string) => any
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
        ...(provider.integrations?.length
          ? { integrations: provider.integrations.join(', ') }
          : {}),
      },
    }
  })
}

/**
 * Tenant-safe live Hub inventory. Identity comes from the verified bearer token;
 * Supabase RLS remains the source of truth for which tenant resources the caller can see.
 * Deployment model availability is sourced from Palladium's existing model gateway config.
 * Native MCP metadata comes from the credential-free catalogue; user-connected MCP metadata
 * comes from external_mcp_servers using only non-secret columns and its cached tool discovery.
 */
export const listAiHubResources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAiHubResourceInput)
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 100
    const mcpDb = context.supabase as unknown as McpDb
    const [agentsRes, workflowsRes, externalMcpRes] = await Promise.all([
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
      mcpDb
        .from('external_mcp_servers')
        .select('id,name,slug,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(Math.min(limit, 50)),
    ])

    if (agentsRes.error) throw new Error(agentsRes.error.message)
    if (workflowsRes.error) throw new Error(workflowsRes.error.message)
    if (externalMcpRes.error) throw new Error(externalMcpRes.error.message)

    const externalMcpResources = (externalMcpRes.data ?? [])
      .flatMap((row: AiHubResourceRecord) => toAiHubExternalMcpResources(row))
      .slice(0, limit)

    const resources: AiHubLiveResource[] = [
      ...listModelResources(),
      ...toAiHubMcpResources(PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS),
      ...externalMcpResources,
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
