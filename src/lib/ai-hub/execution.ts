import type { AiHubOrchestrationPlan } from './orchestrator'
import type { AiHubProviderDefinition, AiHubRegistry } from './registry'

export interface AiHubExecutionContext {
  tenantId: string
  actorId: string
  input?: unknown
  approvalRequestId?: string
  approvalOrgId?: string | null
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
  claim(plan: AiHubOrchestrationPlan, context: AiHubExecutionContext, approvalRequestId: string): Promise<boolean>
  complete(approvalRequestId: string, context: AiHubExecutionContext, result: AiHubExecutionResult): Promise<void>
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
    this.assertPlacement(plan)

    if (plan.requiresApproval) {
      const provider = this.resolveProvider(plan)
      if (!this.approvalGate) throw new Error('AI Hub approval gate is not configured')
      if (!context.approvalRequestId) {
        const approvalRequestId = await this.approvalGate.request(plan, context)
        return { status: 'waiting_for_approval', adapter: provider.adapter, approvalRequestId }
      }
      const claimed = await this.approvalGate.claim(plan, context, context.approvalRequestId)
      if (!claimed) {
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

    try {
      const result = await execute(plan, context)
      if (plan.requiresApproval && context.approvalRequestId) {
        await this.approvalGate?.complete(context.approvalRequestId, context, result)
      }
      return result
    } catch (error) {
      if (plan.requiresApproval && context.approvalRequestId) {
        await this.approvalGate?.complete(context.approvalRequestId, context, {
          status: 'failed',
          adapter: provider.adapter,
          error: error instanceof Error ? error.message : 'AI Hub execution failed',
        })
      }
      throw error
    }
  }

  private assertPlacement(plan: AiHubOrchestrationPlan) {
    const capability = plan.route.capability
    if (plan.placement.workloadId !== plan.workloadId || plan.route.workloadId !== plan.workloadId) {
      throw new Error('AI Hub placement does not match the routed workload')
    }
    if (plan.placement.capabilityId !== capability.id) {
      throw new Error('AI Hub placement does not match the routed capability')
    }
    if (!capability.deploymentTargets.includes(plan.placement.deploymentTarget)) {
      throw new Error('AI Hub placement uses a deployment target not allowed by the routed capability')
    }
  }

  private resolveProvider(plan: AiHubOrchestrationPlan) {
    const provider = this.registry.getProvider(plan.route.capability.providerId)
    if (!provider) {
      throw new Error(`Unknown AI Hub provider: ${plan.route.capability.providerId}`)
    }
    return provider
  }
}
