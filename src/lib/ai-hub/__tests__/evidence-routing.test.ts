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

function trustedWorkload(): AiHubWorkload {
  const request = workload()
  request.requirements.evidenceRouting = {
    mode: 'evidence-gated',
    promptAssessment: {
      relevance: 'relevant',
      grounding: 'grounded',
      ambiguity: 'clear',
      approval: 'not-required',
      source: 'blackstar-policy-verifier',
      evidenceIds: ['verified-fixture'],
    },
  }
  return request
}

describe('AI Hub evidence-gated decision routes', () => {
  it('keeps existing selection intact unless the new mode is explicitly requested', () => {
    const legacy = routeAiHubWorkload(workload(false), [model])
    expect(legacy?.capability.id).toBe('configured-model')
    expect(legacy?.decisionTrace).toBeUndefined()
  })

  it('uses a verified read-only deterministic executor only with adequate actual history', () => {
    const route = routeAiHubWorkload(trustedWorkload(), [model, code])
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
    expect(result?.decisionTrace?.reasons.join(' ')).toContain('insufficient for deterministic routing')
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
    const requires = trustedWorkload()
    requires.requirements.requireHumanApproval = true
    const plan = new AiHubOrchestrator(() => [code]).plan({ workload: requires })
    expect(plan?.route.decisionTrace?.lane).toBe('approval-required')
    expect(plan?.requiresApproval).toBe(true)
  })
  it('treats missing prompt grounding as a reason to escalate rather than executing code', () => {
    const result = routeAiHubWorkload(workload(), [code, model])
    expect(result?.decisionTrace?.lane).toBe('model-escalation')
    expect(result?.capability.id).toBe(model.id)
  })

  it('requires approval when the prompt policy marks an otherwise grounded task as approval-required', () => {
    const required = trustedWorkload()
    required.requirements.evidenceRouting!.promptAssessment!.approval = 'required'
    const result = new AiHubOrchestrator(() => [code, model]).plan({ workload: required })
    expect(result?.route.decisionTrace?.lane).toBe('approval-required')
    expect(result?.requiresApproval).toBe(true)
  })

  it('will not route a policy-verified irrelevant prompt', () => {
    const irrelevant = trustedWorkload()
    irrelevant.requirements.evidenceRouting!.promptAssessment!.relevance = 'irrelevant'
    expect(routeAiHubWorkload(irrelevant, [code, model])).toBeNull()
  })

  it('does not accept unverified self-declared prompt confidence as permission for code execution', () => {
    const unverified = trustedWorkload()
    unverified.requirements.evidenceRouting!.promptAssessment!.source = 'unverified'
    expect(routeAiHubWorkload(unverified, [code, model])?.decisionTrace?.lane).toBe('model-escalation')
  })

})
