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

export type AiHubMcpServerDefinition = {
  name: string
  title: string
  version: string
  resourcePath: string
  listToolsPath: string
  auth: string
}

export type AiHubMcpToolDefinition = {
  name: string
  title: string
  description: string
  area: string
  access: string
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
 * Projects the existing Palladium MCP catalogue into the Hub contract. The MCP
 * catalogue remains authoritative; the Hub only provides a discoverable view.
 */
export function toAiHubMcpResources(
  server: AiHubMcpServerDefinition,
  tools: readonly AiHubMcpToolDefinition[],
): AiHubLiveResource[] {
  const providerId = 'palladium-mcp'
  const serverResource: AiHubLiveResource = {
    id: server.name,
    kind: 'mcp',
    name: server.title,
    status: 'available',
    providerId,
    capabilities: tools.map((tool) => tool.name),
    metadata: {
      version: server.version,
      auth: server.auth,
      resourcePath: server.resourcePath,
      listToolsPath: server.listToolsPath,
      toolCount: String(tools.length),
    },
  }

  const toolResources = tools.map<AiHubLiveResource>((tool) => ({
    id: `${server.name}:${tool.name}`,
    kind: 'tool',
    name: tool.title,
    status: 'available',
    providerId,
    capabilities: [tool.name],
    metadata: {
      server: server.name,
      area: tool.area,
      access: tool.access,
      description: tool.description,
    },
  }))

  return [serverResource, ...toolResources]
}

function normaliseExternalMcpTools(value: unknown): Array<{ name: string; description: string }> {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const name = typeof row['name'] === 'string' ? row['name'].trim() : ''
    if (!name) return []
    return [{
      name,
      description: typeof row['description'] === 'string' ? row['description'] : '',
    }]
  })
}

/**
 * Projects an RLS-scoped external MCP connection and its already-discovered
 * tool cache into Hub resources. Credential ciphertext and auth values are
 * intentionally never accepted by this mapper or returned to the browser.
 */
export function toAiHubExternalMcpResources(row: AiHubResourceRecord): AiHubLiveResource[] {
  const id = String(row['id'] ?? '')
  const slug = String(row['slug'] ?? id)
  const tools = normaliseExternalMcpTools(row['cached_tools'])
  const allowedNames = Array.isArray(row['allowed_tool_names'])
    ? row['allowed_tool_names'].map(String).filter(Boolean)
    : []
  const allow = new Set(allowedNames)
  const visibleTools = allow.size > 0 ? tools.filter((tool) => allow.has(tool.name)) : tools
  const enabled = row['enabled'] !== false
  const requiresApproval = row['requires_approval'] !== false
  const providerId = `external-mcp:${id}`

  const server: AiHubLiveResource = {
    id,
    kind: 'mcp',
    name: String(row['name'] ?? slug),
    status: enabled ? 'enabled' : 'disabled',
    providerId,
    capabilities: visibleTools.map((tool) => tool.name),
    metadata: {
      source: 'external',
      slug,
      requiresApproval: String(requiresApproval),
      toolCount: String(visibleTools.length),
      ...(row['last_discovered_at'] ? { lastDiscoveredAt: String(row['last_discovered_at']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }

  const toolResources = visibleTools.map<AiHubLiveResource>((tool) => ({
    id: `${id}:${tool.name}`,
    kind: 'tool',
    name: tool.name,
    status: enabled ? 'available' : 'disabled',
    providerId,
    capabilities: [tool.name],
    metadata: {
      source: 'external-mcp',
      server: slug,
      access: 'external',
      requiresApproval: String(requiresApproval),
      ...(tool.description ? { description: tool.description } : {}),
    },
  }))

  return [server, ...toolResources]
}

export function countAiHubResources(resources: readonly AiHubLiveResource[]) {
  const models = resources.filter((resource) => resource.kind === 'model').length
  const agents = resources.filter((resource) => resource.kind === 'agent').length
  const tools = resources.filter((resource) => resource.kind === 'tool').length
  const mcp = resources.filter((resource) => resource.kind === 'mcp').length
  const workflows = resources.filter((resource) => resource.kind === 'workflow').length

  return {
    models,
    agents,
    tools,
    mcp,
    workflows,
    total: resources.length,
  }
}
