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
export type AiHubMcpServerDefinition = { name: string; title: string; version: string; resourcePath: string; listToolsPath: string; auth: string }
export type AiHubMcpToolDefinition = { name: string; title: string; description: string; area: string; access: string }

export function toAiHubLiveResource(row: AiHubResourceRecord, kind: AiHubCapabilityKind, providerId: string): AiHubLiveResource {
  const allowedTools = row['allowed_tools']
  const capabilities = Array.isArray(allowedTools) ? allowedTools.map(String) : []
  const id = String(row['id'] ?? '')
  return {
    id, kind, name: String(row['name'] ?? row['title'] ?? id),
    status: String(row['status'] ?? 'available'), providerId, capabilities,
    metadata: {
      ...(row['model'] ? { model: String(row['model']) } : {}),
      ...(row['model_provider'] ? { modelProvider: String(row['model_provider']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
}

export function toAiHubSkillResource(row: AiHubResourceRecord): AiHubLiveResource {
  const id = String(row['id'] ?? '')
  const requiredTools = Array.isArray(row['requires_tools']) ? row['requires_tools'].map(String) : []
  const requiredScripts = Array.isArray(row['requires_scripts']) ? row['requires_scripts'].map(String) : []
  return {
    id, kind: 'tool', name: String(row['name'] ?? id),
    status: row['enabled'] === false ? 'disabled' : 'enabled', providerId: 'palladium-skills', capabilities: requiredTools,
    metadata: {
      resourceType: 'skill',
      ...(row['description'] ? { description: String(row['description']) } : {}),
      ...(row['version'] ? { version: String(row['version']) } : {}),
      ...(row['source_kind'] ? { sourceKind: String(row['source_kind']) } : {}),
      ...(row['scan_verdict'] ? { scanVerdict: String(row['scan_verdict']) } : {}),
      dangerous: String(Boolean(row['dangerous'])), requiresScripts: String(requiredScripts.length > 0),
      scriptCount: String(requiredScripts.length),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
}

/** Projects a published Marketplace agent listing without exposing its executable config. */
export function toAiHubMarketplaceAgentResource(row: AiHubResourceRecord): AiHubLiveResource {
  const id = String(row['id'] ?? '')
  const tags = Array.isArray(row['tags']) ? row['tags'].map(String).filter(Boolean) : []
  return {
    id,
    kind: 'agent',
    name: String(row['title'] ?? id),
    status: 'published',
    providerId: 'palladium-marketplace',
    capabilities: tags,
    metadata: {
      resourceType: 'marketplace-listing',
      source: 'marketplace',
      ...(row['summary'] ? { description: String(row['summary']) } : row['description'] ? { description: String(row['description']) } : {}),
      ...(row['category'] ? { category: String(row['category']) } : {}),
      ...(row['version'] ? { version: String(row['version']) } : {}),
      ...(row['required_plan'] ? { requiredPlan: String(row['required_plan']) } : {}),
      ...(row['price_pence'] != null ? { pricePence: String(row['price_pence']) } : {}),
      ...(row['currency'] ? { currency: String(row['currency']) } : {}),
      ...(row['install_count'] != null ? { installCount: String(row['install_count']) } : {}),
      ...(row['rating_avg'] != null ? { rating: String(row['rating_avg']) } : {}),
      ...(row['rating_count'] != null ? { ratingCount: String(row['rating_count']) } : {}),
      ...(row['published_at'] ? { publishedAt: String(row['published_at']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
}

export function toAiHubMcpResources(server: AiHubMcpServerDefinition, tools: readonly AiHubMcpToolDefinition[]): AiHubLiveResource[] {
  const providerId = 'palladium-mcp'
  const serverResource: AiHubLiveResource = {
    id: server.name, kind: 'mcp', name: server.title, status: 'available', providerId,
    capabilities: tools.map((tool) => tool.name),
    metadata: { version: server.version, auth: server.auth, resourcePath: server.resourcePath, listToolsPath: server.listToolsPath, toolCount: String(tools.length) },
  }
  const toolResources = tools.map<AiHubLiveResource>((tool) => ({
    id: `${server.name}:${tool.name}`, kind: 'tool', name: tool.title, status: 'available', providerId,
    capabilities: [tool.name], metadata: { server: server.name, area: tool.area, access: tool.access, description: tool.description },
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
    return [{ name, description: typeof row['description'] === 'string' ? row['description'] : '' }]
  })
}

export function toAiHubExternalMcpResources(row: AiHubResourceRecord): AiHubLiveResource[] {
  const id = String(row['id'] ?? '')
  const slug = String(row['slug'] ?? id)
  const tools = normaliseExternalMcpTools(row['cached_tools'])
  const allowedNames = Array.isArray(row['allowed_tool_names']) ? row['allowed_tool_names'].map(String).filter(Boolean) : []
  const allow = new Set(allowedNames)
  const visibleTools = allow.size > 0 ? tools.filter((tool) => allow.has(tool.name)) : tools
  const enabled = row['enabled'] !== false
  const requiresApproval = row['requires_approval'] !== false
  const providerId = `external-mcp:${id}`
  const server: AiHubLiveResource = {
    id, kind: 'mcp', name: String(row['name'] ?? slug), status: enabled ? 'enabled' : 'disabled', providerId,
    capabilities: visibleTools.map((tool) => tool.name),
    metadata: {
      source: 'external', slug, requiresApproval: String(requiresApproval), toolCount: String(visibleTools.length),
      ...(row['last_discovered_at'] ? { lastDiscoveredAt: String(row['last_discovered_at']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
  const toolResources = visibleTools.map<AiHubLiveResource>((tool) => ({
    id: `${id}:${tool.name}`, kind: 'tool', name: tool.name, status: enabled ? 'available' : 'disabled', providerId,
    capabilities: [tool.name], metadata: {
      source: 'external-mcp', server: slug, access: 'external', requiresApproval: String(requiresApproval),
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
  const skills = resources.filter((resource) => resource.providerId === 'palladium-skills').length
  const marketplace = resources.filter((resource) => resource.providerId === 'palladium-marketplace').length
  return { models, agents, tools, mcp, skills, marketplace, workflows, total: resources.length }
}
