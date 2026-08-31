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

/** Projects an existing tenant-visible Skill into the Hub tool contract. */
export function toAiHubSkillResource(row: AiHubResourceRecord): AiHubLiveResource {
  const id = String(row['id'] ?? '')
  const requiredTools = Array.isArray(row['requires_tools']) ? row['requires_tools'].map(String) : []
  const requiredScripts = Array.isArray(row['requires_scripts']) ? row['requires_scripts'].map(String) : []

  return {
    id,
    kind: 'tool',
    name: String(row['name'] ?? id),
    status: row['enabled'] === false ? 'disabled' : 'enabled',
    providerId: 'palladium-skills',
    capabilities: requiredTools,
    metadata: {
      resourceType: 'skill',
      ...(row['description'] ? { description: String(row['description']) } : {}),
      ...(row['version'] ? { version: String(row['version']) } : {}),
      ...(row['source_kind'] ? { sourceKind: String(row['source_kind']) } : {}),
      ...(row['scan_verdict'] ? { scanVerdict: String(row['scan_verdict']) } : {}),
      dangerous: String(Boolean(row['dangerous'])),
      requiresScripts: String(requiredScripts.length > 0),
      scriptCount: String(requiredScripts.length),
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

export function countAiHubResources(resources: readonly AiHubLiveResource[]) {
  const models = resources.filter((resource) => resource.kind === 'model').length
  const agents = resources.filter((resource) => resource.kind === 'agent').length
  const tools = resources.filter((resource) => resource.kind === 'tool').length
  const mcp = resources.filter((resource) => resource.kind === 'mcp').length
  const workflows = resources.filter((resource) => resource.kind === 'workflow').length
  const skills = resources.filter((resource) => resource.providerId === 'palladium-skills').length

  return {
    models,
    agents,
    tools,
    mcp,
    skills,
    workflows,
    total: resources.length,
  }
}
