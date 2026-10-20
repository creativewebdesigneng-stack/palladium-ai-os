import { describe, expect, it, vi } from 'vitest'
import { routeAiHubWorkload } from '../router'
import { AiHubOrchestrator } from '../orchestrator'
import { AiHubExecutionGateway } from '../execution'
import { createPalladiumAiHubRegistry } from '../registry'
import type { AiHubCapabilityRef, AiHubWorkload } from '../contracts'

const model: AiHubCapabilityRef = {
  id: 'configured-model', kind: 'model', providerId: 'palladium-model-gateway',
  name: 'Configured model', capabilities: ['analyse'], deploymentTargets: ['palladium-cloud'],
  metadata: { configured: 'true', recentRuns: 50, succeededRuns: 45, failedRuns: 5 },
}
const code: AiHubCapabilityRef = {
  id: 'verified-tool', kind: 'tool', providerId: 'palladium-mcp',
  name: 'Verified read-only tool', capabilities: ['analyse'], deploymentTargets: ['palladium-cloud'],
  metadata: {
    executionClass: 'deterministic', verifiedExecutor: true, readOnly: true,
    recentRuns: 100, succeededRuns: 95, failedRuns: 5,
  },
}
function workload(evidence = true): AiHubWorkload {
  return {
    id: 'evidence-1', tenantId: 'tenant-1', actorId: 'actor-1', goal: 'Analyse bounded data',
    requirements: { capabilities: ['analyse'], ...(evidence ? { evidenceRouting: { mode: 'evidence-gated' as const } } : {}) },
  }
}

describe('AI Hub evidence-gated decision routes', () => {
  it('keeps existing selection intact unless the new mode is explicitly requested', () => {
    const legacy = routeAiHubWorkload(workload(false), [model])
    expect(legacy?.capability.id).toBe('configured-model')
    expect(legacy?.decisionTrace).toBeUndefined()
  })

  it('uses a verified read-only deterministic executor only with adequate actual history', () => {
    const route = routeAiHubWorkload(workload(), [model, code])
    expect(route?.capability.id).toBe('verified-tool')
    expect(route?.decisionTrace).toMatchObject({
      status: 'planned-not-executed', lane: 'deterministic', observedRuns: 100,
      thresholds: { minObservedRuns: 20, minReliability: 0.8 },
    })
    expect(route?.policyChecks).toContain('evidence-gated-routing')
  })

  it('escalates to a configured model when execution evidence is missing, never invents tool confidence', () => {
    const unknown = { ...code, metadata: { executionClass: 'deterministic', verifiedExecutor: true, readOnly: true } }
    const result = routeAiHubWorkload(workload(), [unknown, model])
    expect(result?.capability.id).toBe('configured-model')
    expect(result?.decisionTrace?.lane).toBe('model-escalation')
    expect(result?.decisionTrace?.reasons.join(' ')).toContain('evidence floor')
  })

  it('rejects unsafe and unconfigured paths into human review through the existing approval gate', async () => {
    const unconfigured = { ...model, metadata: { configured: 'false' } }
    const unsafe = { ...code, metadata: { ...code.metadata, readOnly: false } }
    const plan = new AiHubOrchestrator(() => [unsafe, unconfigured]).plan({ workload: workload() })
    expect(plan?.route.decisionTrace?.lane).toBe('approval-required')
    expect(plan?.route.policyChecks).toContain('approval-required')
    expect(plan?.requiresApproval).toBe(true)
    expect(plan?.route.decisionTrace?.status).toBe('planned-not-executed')
    const gateway = new AiHubExecutionGateway(createPalladiumAiHubRegistry())
    const execute = vi.fn(async () => ({ status: 'completed' as const, adapter: 'mcp' as const }))
    gateway.registerAdapter('mcp', execute)
    if (!plan) throw new Error('Expected a plan')
    await expect(gateway.execute(plan, { tenantId: 'tenant-1', actorId: 'actor-1' }))
      .rejects.toThrow('approval gate is not configured')
    expect(execute).not.toHaveBeenCalled()
    await expect(gateway.execute({ ...plan, requiresApproval: false }, {
      tenantId: 'tenant-1', actorId: 'actor-1',
    })).rejects.toThrow('cannot execute without approval')
    expect(execute).not.toHaveBeenCalled()
  })

  it('refuses to route if no capability satisfies declared requirements', () => {
    expect(routeAiHubWorkload(workload(), [{ ...model, capabilities: ['unrelated'] }])).toBeNull()
  })

  it('never treats approval as optional even for a deterministic lane', () => {
    const requires = workload()
    requires.requirements.requireHumanApproval = true
    const plan = new AiHubOrchestrator(() => [code]).plan({ workload: requires })
    expect(plan?.route.decisionTrace?.lane).toBe('deterministic')
    expect(plan?.requiresApproval).toBe(true)
  })
})
