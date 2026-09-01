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

type ExternalMcpQueryResult = {
  data: AiHubResourceRecord[] | null
  error: { message: string } | null
}

type ExternalMcpQuery = {
  select: (columns: string) => {
    order: (column: string, options: { ascending: boolean }) => {
      limit: (limit: number) => PromiseLike<ExternalMcpQueryResult>
    }
  }
}

type ExternalMcpDb = {
  from: (table: 'external_mcp_servers') => ExternalMcpQuery
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
 * Supabase RLS remains the source of truth for tenant-visible records. Runtime
 * model availability comes from Palladium's model gateway. Native MCP metadata
 * comes from the credential-free catalogue, while external MCP records are read
 * through their existing RLS table without exposing auth ciphertext or secrets.
 */
export const listAiHubResources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAiHubResourceInput)
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 100
    // external_mcp_servers predates the generated Supabase Database type used by
    // this client. Keep the authenticated/RLS-scoped client and narrow only the
    // query surface until the generated schema is refreshed.
    const externalMcpDb = context.supabase as unknown as ExternalMcpDb
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
      externalMcpDb
        .from('external_mcp_servers')
        .select('id,name,slug,enabled,requires_approval,allowed_tool_names,cached_tools,last_discovered_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit),
    ])

    if (agentsRes.error) throw new Error(agentsRes.error.message)
    if (workflowsRes.error) throw new Error(workflowsRes.error.message)
    if (externalMcpRes.error) throw new Error(externalMcpRes.error.message)

    const resources: AiHubLiveResource[] = [
      ...listModelResources(),
      ...toAiHubMcpResources(PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS),
      ...(externalMcpRes.data ?? []).flatMap((row) => toAiHubExternalMcpResources(row)),
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
