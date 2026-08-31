import type { AiHubCapabilityKind } from './contracts'

export interface AiHubLiveResource {
  id: string
  kind: AiHubCapabilityKind
  name: string
  status: string
  providerId: string
  capabilities: string[]
  metadata: Record<string, unknown>
}

export type AiHubResourceRecord = Record<string, unknown>

export function toAiHubLiveResource(
  row: AiHubResourceRecord,
  kind: AiHubCapabilityKind,
  providerId: string,
): AiHubLiveResource {
  const capabilities = Array.isArray(row.allowed_tools)
    ? row.allowed_tools.map(String)
    : []

  const id = String(row.id ?? '')

  return {
    id,
    kind,
    name: String(row.name ?? row.title ?? id),
    status: String(row.status ?? 'available'),
    providerId,
    capabilities,
    metadata: {
      ...(row.model ? { model: row.model } : {}),
      ...(row.model_provider ? { modelProvider: row.model_provider } : {}),
      ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    },
  }
}

export function countAiHubResources(resources: readonly AiHubLiveResource[]) {
  const agents = resources.filter((resource) => resource.kind === 'agent').length
  const workflows = resources.filter((resource) => resource.kind === 'workflow').length

  return {
    agents,
    workflows,
    total: resources.length,
  }
}
