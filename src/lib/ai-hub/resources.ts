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

/** Projects a Smart Table as a dataset without exposing record contents. */
export function toAiHubDatasetResource(row: AiHubResourceRecord): AiHubLiveResource {
  const id = String(row['id'] ?? '')
  const fields = Array.isArray(row['fields']) ? row['fields'] : []
  const fieldTypes = fields.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const type = (value as Record<string, unknown>)['type']
    return typeof type === 'string' && type ? [type] : []
  })
  const capabilities = ['structured-data']
  if (fieldTypes.length) capabilities.push('schema-defined')

  return {
    id,
    kind: 'dataset',
    name: String(row['name'] ?? id),
    status: 'available',
    providerId: 'palladium-smart-tables',
    capabilities,
    metadata: {
      resourceType: 'smart-table',
      source: 'smart-tables',
      ...(row['description'] ? { description: String(row['description']) } : {}),
      fieldCount: String(fields.length),
      ...(fieldTypes.length ? { fieldTypes: Array.from(new Set(fieldTypes)).join(', ') } : {}),
      ...(row['default_view'] ? { defaultView: String(row['default_view']) } : {}),
      ...(row['created_at'] ? { createdAt: String(row['created_at']) } : {}),
      ...(row['updated_at'] ? { updatedAt: String(row['updated_at']) } : {}),
    },
  }
}

/** Projects a Builder job as an App resource without prompts, source, repository or credential material. */
export function toAiHubAppResource(row: AiHubResourceRecord): AiHubLiveResource {
  const id = String(row['id'] ?? '')
  const sourceStatus = String(row['source_status'] ?? 'not_started')
  const repositoryStatus = String(row['repository_status'] ?? 'not_started')
  const sandboxStatus = String(row['sandbox_status'] ?? 'not_started')
  const deploymentStatus = row['deployment_status'] ? String(row['deployment_status']) : null
  const productionStatus = row['production_status'] ? String(row['production_status']) : null
  const capabilities = ['app-build']
  if (sourceStatus === 'generated') capabilities.push('source-generated')
  if (repositoryStatus === 'files_applied') capabilities.push('repository-synced')
  if (sandboxStatus === 'passed') capabilities.push('sandbox-validated')
  if (deploymentStatus === 'ready') capabilities.push('preview-deployed')
  if (productionStatus === 'promoted') capabilities.push('production-deployed')

  return {
    id,
    kind: 'app',
    name: String(row['title'] ?? id),
    status: productionStatus === 'promoted' ? 'production' : deploymentStatus === 'ready' ? 'preview-ready' : String(row['status'] ?? 'requested'),
    providerId: 'palladium-app-studio',
    capabilities,
    metadata: {
      resourceType: 'builder-app',
      source: 'app-studio',
      sourceStatus,
      repositoryStatus,
      sandboxStatus,
      ...(deploymentStatus ? { deploymentStatus } : {}),
      ...(row['deployment_provider'] ? { deploymentProvider: String(row['deployment_provider']) } : {}),
      ...(productionStatus ? { productionStatus } : {}),
      ...(row['created_at'] ? { createdAt: String(row['created_at']) } : {}),
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
  const apps = resources.filter((resource) => resource.kind === 'app').length
  const datasets = resources.filter((resource) => resource.kind === 'dataset').length
  const workflows = resources.filter((resource) => resource.kind === 'workflow').length
  const skills = resources.filter((resource) => resource.providerId === 'palladium-skills').length
  const marketplace = resources.filter((resource) => resource.providerId === 'palladium-marketplace').length
  return { models, agents, tools, mcp, apps, datasets, skills, marketplace, workflows, total: resources.length }
}
