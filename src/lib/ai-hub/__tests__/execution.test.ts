import { describe, expect, it, vi } from 'vitest'
import { AiHubExecutionGateway } from '../execution'
import { createPalladiumAiHubRegistry } from '../registry'
import { AiHubRuntimeTargetRegistry } from '../runtime-targets'
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

function createPortablePlan(): AiHubOrchestrationPlan {
  const plan = createPlan()
  return {
    ...plan,
    placement: {
      ...plan.placement,
      deploymentTarget: 'on-prem',
      region: 'uk',
      privateExecution: true,
    },
    route: {
      ...plan.route,
      capability: {
        ...plan.route.capability,
        deploymentTargets: ['on-prem'],
        regions: ['uk'],
      },
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

  it('fails closed when a portable runtime target is not attested', async () => {
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'model-gateway' as const }))
    gateway.registerAdapter('model-gateway', execute)

    await expect(gateway.execute(createPortablePlan(), {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
    })).rejects.toThrow('portable runtime target registry is not configured')
    expect(execute).not.toHaveBeenCalled()
  })

  it('executes portable workloads only through a healthy attested target owned by the tenant', async () => {
    const runtimeTargets = new AiHubRuntimeTargetRegistry()
    runtimeTargets.register({
      id: 'tenant-1-onprem',
      deploymentTarget: 'on-prem',
      tenantId: 'tenant-1',
      region: 'uk',
      health: 'healthy',
      attestedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })

    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry(), undefined, runtimeTargets)
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'model-gateway' as const }))
    gateway.registerAdapter('model-gateway', execute)

    const result = await gateway.execute(createPortablePlan(), {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
    })

    expect(result.status).toBe('completed')
    expect(execute).toHaveBeenCalledOnce()

    await expect(gateway.execute(createPortablePlan(), {
      tenantId: 'tenant-2',
      actorId: 'actor-2',
    })).rejects.toThrow('not healthy and attested for this tenant')
  })
})
