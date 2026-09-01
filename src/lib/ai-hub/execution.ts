import type { AiHubOrchestrationPlan } from './orchestrator'
import type { AiHubProviderDefinition, AiHubRegistry } from './registry'

export interface AiHubExecutionContext {
  tenantId: string
  actorId: string
  input?: unknown
  approvalRequestId?: string
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

export interface AiHubApprovalGate {
  request(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext): Promise<string>
  isApproved(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext, approvalRequestId: string): Promise<boolean>
}

export class AiHubExecutionGateway {
  private readonly adapters = new Map<AiHubProviderDefinition['adapter'], AiHubExecutionAdapter>()

  constructor(
    private readonly registry: AiHubRegistry,
    private readonly approvalGate?: AiHubApprovalGate,
  ) {}

  registerAdapter(adapter: AiHubProviderDefinition['adapter'], execute: AiHubExecutionAdapter) {
    this.adapters.set(adapter, execute)
  }

  async execute(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext): Promise<AiHubExecutionResult> {
    if (!context.tenantId || !context.actorId) {
      throw new Error('AI Hub execution requires tenant and actor identity')
    }

    if (plan.requiresApproval) {
      const provider = this.resolveProvider(plan)
      if (!this.approvalGate) throw new Error('AI Hub approval gate is not configured')
      if (!context.approvalRequestId) {
        const approvalRequestId = await this.approvalGate.request(plan, context)
        return { status: 'waiting_for_approval', adapter: provider.adapter, approvalRequestId }
      }
      const approved = await this.approvalGate.isApproved(plan, context, context.approvalRequestId)
      if (!approved) {
        return {
          status: 'waiting_for_approval',
          adapter: provider.adapter,
          approvalRequestId: context.approvalRequestId,
        }
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
