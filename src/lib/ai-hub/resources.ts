import type { AiHubCapabilityKind } from './contracts'

export interface AiHubLiveResource {
  id: string
  kind: AiHubCapabilityKind
  name: string
  status: string
  providerId: string
  capabilities: string[]
  metadata: Record<string, string>
}

export type AiHubResourceRecord = Record<string, unknown>

type CachedMcpTool = {
  name: string
  description?: string
}

function normaliseCachedMcpTools(value: unknown): CachedMcpTool[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const name = typeof row['name'] === 'string' ? row['name'].trim() : ''
    if (!name) return []
    const description = typeof row['description'] === 'string' ? row['description'].trim() : ''
    return [{ name, ...(description ? { description } : {}) }]
  })
}

export function toAiHubLiveResource(
  row: AiHubResourceRecord,
  kind: AiHubCapabilityKind,
  providerId: string,
): AiHubLiveResource {
  const allowedTools = row['allowed_tools']
  const capabilities = Array.isArray(allowedTools)
    ? allowedTools.map(String)
    : []

  const id = String(row['id'] ?? '')

  return {
    id,
    kind,
    name: String(row['name'] ?? row['title'] ?? id),
    status: String(row['status'] ?? 'available'),
    providerId,
    capabilities,
    metadata: {
      ...(row['model'] ? { model: String(row['model']) } : {}),
      ...(row['model_provider'] ? { modelProvider: String(row['model_provider']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
}

/**
 * Adapts Palladium's existing external_mcp_servers rows into the canonical Hub
 * inventory. Credentials and endpoint/auth configuration are intentionally not
 * copied into Hub metadata. Cached tool discovery remains owned by the MCP runtime.
 */
export function toAiHubMcpResources(row: AiHubResourceRecord): AiHubLiveResource[] {
  const id = String(row['id'] ?? '')
  if (!id) return []

  const name = String(row['name'] ?? row['slug'] ?? id)
  const slug = String(row['slug'] ?? '')
  const enabled = row['enabled'] !== false
  const requiresApproval = row['requires_approval'] !== false
  const allowedToolNames = Array.isArray(row['allowed_tool_names'])
    ? row['allowed_tool_names'].map(String).filter(Boolean)
    : []
  const cachedTools = normaliseCachedMcpTools(row['cached_tools'])
  const visibleTools = allowedToolNames.length
    ? cachedTools.filter((tool) => allowedToolNames.includes(tool.name))
    : cachedTools
  const toolNames = visibleTools.map((tool) => tool.name)

  const server: AiHubLiveResource = {
    id,
    kind: 'mcp',
    name,
    status: enabled ? 'enabled' : 'disabled',
    providerId: 'palladium-mcp-runtime',
    capabilities: toolNames,
    metadata: {
      ...(slug ? { slug } : {}),
      requiresApproval: String(requiresApproval),
      toolCount: String(toolNames.length),
      ...(row['last_discovered_at'] ? { lastDiscoveredAt: String(row['last_discovered_at']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }

  const tools: AiHubLiveResource[] = visibleTools.map((tool) => ({
    id: `${id}:${tool.name}`,
    kind: 'tool',
    name: tool.name,
    status: enabled ? 'available' : 'disabled',
    providerId: 'palladium-mcp-runtime',
    capabilities: ['mcp-tool'],
    metadata: {
      mcpServerId: id,
      mcpServerName: name,
      ...(slug ? { mcpServerSlug: slug } : {}),
      requiresApproval: String(requiresApproval),
      ...(tool.description ? { description: tool.description.slice(0, 500) } : {}),
    },
  }))

  return [server, ...tools]
}

export function countAiHubResources(resources: readonly AiHubLiveResource[]) {
  const models = resources.filter((resource) => resource.kind === 'model').length
  const agents = resources.filter((resource) => resource.kind === 'agent').length
  const mcp = resources.filter((resource) => resource.kind === 'mcp').length
  const tools = resources.filter((resource) => resource.kind === 'tool').length
  const workflows = resources.filter((resource) => resource.kind === 'workflow').length

  return {
    models,
    agents,
    mcp,
    tools,
    workflows,
    total: resources.length,
  }
}
