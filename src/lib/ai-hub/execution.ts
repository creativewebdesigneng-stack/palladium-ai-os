import type { AiHubOrchestrationPlan } from './orchestrator'
import type { AiHubProviderDefinition, AiHubRegistry } from './registry'

export interface AiHubExecutionContext {
  tenantId: string
  actorId: string
  input?: unknown
}

export interface AiHubExecutionResult {
  status: 'completed' | 'waiting_for_approval' | 'failed'
  adapter: AiHubProviderDefinition['adapter']
  output?: unknown
  approvalRequestId?: string
  error?: string
}

export type AiHubExecutionAdapter = (
  plan: AiHubOrchestrationPlan,
  context: AiHubExecutionContext,
) => Promise<AiHubExecutionResult>

export class AiHubExecutionGateway {
  private readonly adapters = new Map<AiHubProviderDefinition['adapter'], AiHubExecutionAdapter>()

  constructor(private readonly registry: AiHubRegistry) {}

  registerAdapter(adapter: AiHubProviderDefinition['adapter'], execute: AiHubExecutionAdapter) {
    this.adapters.set(adapter, execute)
  }

  async execute(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext): Promise<AiHubExecutionResult> {
    if (!context.tenantId || !context.actorId) {
      throw new Error('AI Hub execution requires tenant and actor identity')
    }

    if (plan.requiresApproval) {
      return {
        status: 'waiting_for_approval',
        adapter: this.resolveProvider(plan).adapter,
      }
    }

    const provider = this.resolveProvider(plan)
    if (!provider.enabled) {
      throw new Error(`AI Hub provider is disabled: ${provider.id}`)
    }

    const execute = this.adapters.get(provider.adapter)
    if (!execute) {
      throw new Error(`No AI Hub execution adapter registered for: ${provider.adapter}`)
    }

    return execute(plan, context)
  }

  private resolveProvider(plan: AiHubOrchestrationPlan) {
    const provider = this.registry.getProvider(plan.route.capability.providerId)
    if (!provider) {
      throw new Error(`Unknown AI Hub provider: ${plan.route.capability.providerId}`)
    }
    return provider
  }
}
