import { describe, expect, it, vi } from 'vitest'
import { AiHubExecutionGateway } from '../execution'
import { completedNativeExecution, registerPalladiumNativeAdapters } from '../native-adapters'
import { createPalladiumAiHubRegistry } from '../registry'
import type { AiHubOrchestrationPlan } from '../orchestrator'

const plan: AiHubOrchestrationPlan = {
  workloadId: 'workload-1',
  discovery: [],
  requiresApproval: false,
  executionBoundary: 'palladium-policy-gateway',
  placement: {
    workloadId: 'workload-1', capabilityId: 'model-1', deploymentTarget: 'palladium-cloud',
    privateExecution: false, reason: 'test placement', policyChecks: ['deployment-target'],
  },
  route: {
    workloadId: 'workload-1',
    capability: {
      id: 'model-1',
      kind: 'model',
      providerId: 'palladium-model-gateway',
      name: 'Model',
      capabilities: ['reasoning'],
      deploymentTargets: ['palladium-cloud'],
    },
    reason: 'matched workload requirements',
    policyChecks: ['tenant-isolation'],
  },
}

describe('registerPalladiumNativeAdapters', () => {
  it('registers supplied native subsystem executors and dispatches through the gateway', async () => {
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    const execute = vi.fn(async () => completedNativeExecution('model-gateway', { ok: true }))

    expect(registerPalladiumNativeAdapters(gateway, { 'model-gateway': { execute } })).toEqual(['model-gateway'])

    const result = await gateway.execute(plan, {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      input: { prompt: 'hello' },
    })

    expect(execute).toHaveBeenCalledOnce()
    expect(result).toEqual({ status: 'completed', adapter: 'model-gateway', output: { ok: true } })
  })

  it('does not register missing native subsystem executors', () => {
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    expect(registerPalladiumNativeAdapters(gateway, {})).toEqual([])
  })
})
