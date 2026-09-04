import { describe, expect, it } from 'vitest'
import type { AiHubCapabilityRef } from '../contracts'
import { AiHubOrchestrator } from '../orchestrator'
import { planBlackstarOpportunityExecution } from '../opportunity-execution'
import type { BlackstarOpportunityRecommendation } from '../opportunities'

const capabilities: AiHubCapabilityRef[] = [
  {
    id: 'research-tool',
    kind: 'tool',
    providerId: 'tool-runtime',
    name: 'Research Tool',
    capabilities: ['research'],
    deploymentTargets: ['palladium-cloud'],
  },
  {
    id: 'reasoner',
    kind: 'model',
    providerId: 'model-gateway',
    name: 'Reasoner',
    capabilities: ['reasoning'],
    deploymentTargets: ['provider-cloud'],
  },
]

const orchestrator = new AiHubOrchestrator(() => capabilities)

function opportunity(overrides: Partial<BlackstarOpportunityRecommendation> = {}): BlackstarOpportunityRecommendation {
  return {
    signalId: 'signal-1',
    kind: 'growth',
    title: 'Expansion opportunity',
    summary: 'Validated expansion signal',
    score: 0.88,
    confidence: 0.9,
    evidence: ['crm:42', 'market:7'],
    recommendedAction: 'Validate and launch a governed expansion experiment',
    actionRisk: 'low',
    requiresApproval: false,
    policyChecks: ['signal-validity', 'opportunity-score'],
    ...overrides,
  }
}

describe('Blackstar Opportunity Execution', () => {
  it('turns a vetted opportunity into a routed executable mission', () => {
    const plan = planBlackstarOpportunityExecution({
      id: 'execution-1', tenantId: 'tenant-1', actorId: 'actor-1', opportunity: opportunity(),
      stages: [
        { id: 'research', goal: 'Validate the opportunity', capabilities: ['research'], preferredKinds: ['tool'] },
        { id: 'reason', goal: 'Produce the bounded launch decision', capabilities: ['reasoning'], preferredKinds: ['model'], dependsOn: ['research'] },
      ],
    }, orchestrator)

    expect(plan?.status).toBe('ready')
    expect(plan?.intelligence.stages.map((stage) => stage.id)).toEqual(['research', 'reason'])
    expect(plan?.provenance).toEqual(expect.arrayContaining(['opportunity:signal-1', 'evidence:crm:42']))
    expect(plan?.policyChecks).toContain('approval-propagation')
  })

  it('holds approval-gated opportunities before execution', () => {
    const plan = planBlackstarOpportunityExecution({
      id: 'execution-2', tenantId: 'tenant-1', actorId: 'actor-1',
      opportunity: opportunity({ requiresApproval: true, actionRisk: 'medium' }),
      stages: [{ id: 'research', goal: 'Validate', capabilities: ['research'] }],
    }, orchestrator)

    expect(plan?.status).toBe('waiting_for_approval')
    expect(plan?.requiresApproval).toBe(true)
  })

  it('becomes ready after explicit approval', () => {
    const plan = planBlackstarOpportunityExecution({
      id: 'execution-3', tenantId: 'tenant-1', actorId: 'actor-1', approved: true,
      opportunity: opportunity({ requiresApproval: true, actionRisk: 'medium' }),
      stages: [{ id: 'research', goal: 'Validate', capabilities: ['research'] }],
    }, orchestrator)

    expect(plan?.status).toBe('ready')
  })

  it('fails closed when a required execution capability is unavailable', () => {
    const plan = planBlackstarOpportunityExecution({
      id: 'execution-4', tenantId: 'tenant-1', actorId: 'actor-1', opportunity: opportunity(),
      stages: [{ id: 'execute', goal: 'Execute unavailable work', capabilities: ['not-installed'] }],
    }, orchestrator)

    expect(plan).toBeNull()
  })
})
