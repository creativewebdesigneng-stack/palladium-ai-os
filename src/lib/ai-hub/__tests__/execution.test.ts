import { describe, expect, it, vi } from 'vitest'
import { AiHubExecutionGateway } from '../execution'
import { createPalladiumAiHubRegistry } from '../registry'
import type { AiHubOrchestrationPlan } from '../orchestrator'

function createPlan(requiresApproval = false): AiHubOrchestrationPlan {
  return {
    workloadId: 'workload-1',
    discovery: [],
    requiresApproval,
    executionBoundary: 'palladium-policy-gateway',
    placement: {
      workloadId: 'workload-1', capabilityId: 'reasoner', deploymentTarget: 'palladium-cloud',
      privateExecution: false, reason: 'test placement', policyChecks: ['deployment-target'],
    },
    route: {
      workloadId: 'workload-1',
      capability: {
        id: 'reasoner',
        kind: 'model',
        providerId: 'palladium-model-gateway',
        name: 'Reasoner',
        capabilities: ['reasoning'],
        deploymentTargets: ['palladium-cloud'],
      },
      reason: 'Matched workload requirements',
      policyChecks: ['tenant-isolation'],
    },
  }
}

describe('AiHubExecutionGateway', () => {
  it('dispatches a plan through the provider adapter', async () => {
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'model-gateway' as const, output: 'ok' }))
    gateway.registerAdapter('model-gateway', execute)

    const result = await gateway.execute(createPlan(), { tenantId: 'tenant-1', actorId: 'actor-1' })

    expect(result.status).toBe('completed')
    expect(execute).toHaveBeenCalledOnce()
  })

  it('stops at the approval boundary before provider execution', async () => {
    const approvalGate = {
      request: vi.fn(async () => 'approval-1'),
      claim: vi.fn(async () => false),
      complete: vi.fn(async () => undefined),
    }
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry(), approvalGate)
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'model-gateway' as const }))
    gateway.registerAdapter('model-gateway', execute)

    const result = await gateway.execute(createPlan(true), { tenantId: 'tenant-1', actorId: 'actor-1' })

    expect(result.status).toBe('waiting_for_approval')
    expect(result.approvalRequestId).toBe('approval-1')
    expect(approvalGate.request).toHaveBeenCalledOnce()
    expect(execute).not.toHaveBeenCalled()
  })

  it('resumes provider execution only after the same approval request is approved', async () => {
    const approvalGate = {
      request: vi.fn(async () => 'approval-1'),
      claim: vi.fn(async () => true),
      complete: vi.fn(async () => undefined),
    }
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry(), approvalGate)
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'model-gateway' as const }))
    gateway.registerAdapter('model-gateway', execute)

    const result = await gateway.execute(createPlan(true), {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      approvalRequestId: 'approval-1',
    })

    expect(result.status).toBe('completed')
    expect(approvalGate.claim).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'approval-1')
    expect(execute).toHaveBeenCalledOnce()
    expect(approvalGate.complete).toHaveBeenCalledWith('approval-1', expect.anything(), expect.objectContaining({ status: 'completed' }))
  })

  it('rejects execution without tenant and actor identity', async () => {
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    await expect(gateway.execute(createPlan(), { tenantId: '', actorId: '' })).rejects.toThrow('tenant and actor identity')
  })
})
