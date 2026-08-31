import type { AiHubCapabilityKind, AiHubCapabilityRef, AiHubDeploymentTarget } from './contracts'

export interface AiHubDiscoveryQuery {
  text?: string
  kinds?: AiHubCapabilityKind[]
  capabilities?: string[]
  deploymentTargets?: AiHubDeploymentTarget[]
  providerIds?: string[]
  regions?: string[]
}

export interface AiHubDiscoveryResult {
  capability: AiHubCapabilityRef
  score: number
  matched: string[]
}

function normalise(value: string) {
  return value.trim().toLowerCase()
}

export function discoverAiHubCapabilities(
  capabilities: AiHubCapabilityRef[],
  query: AiHubDiscoveryQuery,
): AiHubDiscoveryResult[] {
  const text = query.text ? normalise(query.text) : ''

  return capabilities
    .map((capability) => {
      if (query.kinds?.length && !query.kinds.includes(capability.kind)) return null
      if (query.providerIds?.length && !query.providerIds.includes(capability.providerId)) return null
      if (query.deploymentTargets?.length && !query.deploymentTargets.some((target) => capability.deploymentTargets.includes(target))) return null
      if (query.regions?.length && !query.regions.some((region) => capability.regions?.includes(region))) return null
      if (query.capabilities?.length && !query.capabilities.every((required) => capability.capabilities.includes(required))) return null

      const haystack = normalise([capability.name, capability.kind, capability.providerId, ...capability.capabilities].join(' '))
      if (text && !haystack.includes(text)) return null

      const matched = query.capabilities?.filter((required) => capability.capabilities.includes(required)) ?? []
      let score = matched.length * 20
      if (text && normalise(capability.name).includes(text)) score += 50
      if (query.kinds?.includes(capability.kind)) score += 15
      if (query.deploymentTargets?.some((target) => capability.deploymentTargets.includes(target))) score += 10

      return { capability, score, matched }
    })
    .filter((result): result is AiHubDiscoveryResult => result !== null)
    .sort((a, b) => b.score - a.score || a.capability.name.localeCompare(b.capability.name))
}
