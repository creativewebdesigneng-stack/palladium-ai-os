import type { AiHubCapabilityKind, AiHubCapabilityRef, AiHubDeploymentTarget } from './contracts'

export interface AiHubProviderDefinition {
  id: string
  name: string
  capabilityKinds: AiHubCapabilityKind[]
  deploymentTargets: AiHubDeploymentTarget[]
  adapter: 'model-gateway' | 'agent-runtime' | 'mcp' | 'skills' | 'workflows' | 'app-studio' | 'marketplace' | 'data' | 'compute'
  enabled: boolean
  metadata?: Record<string, unknown>
}

export class AiHubRegistry {
  private readonly providers = new Map<string, AiHubProviderDefinition>()
  private readonly capabilities = new Map<string, AiHubCapabilityRef>()

  registerProvider(provider: AiHubProviderDefinition) {
    this.providers.set(provider.id, provider)
    return provider
  }

  registerCapability(capability: AiHubCapabilityRef) {
    if (!this.providers.has(capability.providerId)) {
      throw new Error(`Unknown AI Hub provider: ${capability.providerId}`)
    }
    this.capabilities.set(capability.id, capability)
    return capability
  }

  getProvider(id: string) {
    return this.providers.get(id)
  }

  listProviders() {
    return [...this.providers.values()]
  }

  listCapabilities(kind?: AiHubCapabilityKind) {
    const values = [...this.capabilities.values()]
    return kind ? values.filter((capability) => capability.kind === kind) : values
  }
}

export function createPalladiumAiHubRegistry() {
  const registry = new AiHubRegistry()

  const providers: AiHubProviderDefinition[] = [
    { id: 'palladium-model-gateway', name: 'Palladium Model Gateway', capabilityKinds: ['model', 'embedding', 'reranker', 'image', 'video', 'voice'], deploymentTargets: ['palladium-cloud', 'provider-cloud', 'customer-cloud', 'on-prem'], adapter: 'model-gateway', enabled: true },
    { id: 'palladium-agent-runtime', name: 'Palladium Agent Runtime', capabilityKinds: ['agent', 'tool'], deploymentTargets: ['palladium-cloud', 'customer-cloud', 'on-prem', 'edge'], adapter: 'agent-runtime', enabled: true },
    { id: 'palladium-mcp', name: 'Palladium MCP', capabilityKinds: ['mcp', 'tool'], deploymentTargets: ['palladium-cloud', 'customer-cloud', 'on-prem'], adapter: 'mcp', enabled: true },
    { id: 'palladium-skills', name: 'Palladium Skills', capabilityKinds: ['tool'], deploymentTargets: ['palladium-cloud', 'customer-cloud', 'on-prem', 'edge'], adapter: 'skills', enabled: true },
    { id: 'palladium-workflows', name: 'Palladium Workflows', capabilityKinds: ['workflow'], deploymentTargets: ['palladium-cloud', 'customer-cloud', 'on-prem'], adapter: 'workflows', enabled: true },
    { id: 'palladium-app-studio', name: 'Palladium App Studio', capabilityKinds: ['app'], deploymentTargets: ['palladium-cloud', 'customer-cloud'], adapter: 'app-studio', enabled: true },
  ]

  providers.forEach((provider) => registry.registerProvider(provider))
  return registry
}
