import { describe, expect, it } from 'vitest'
import type { AiHubCapabilityRef } from '../contracts'
import { planBlackstarIntelligence } from '../intelligence'
import { AiHubOrchestrator } from '../orchestrator'

const capabilities: AiHubCapabilityRef[] = [
  {
    id: 'reasoner',
    kind: 'model',
    providerId: 'model-gateway',
    name: 'Reasoner',
    capabilities: ['reasoning'],
    deploymentTargets: ['provider-cloud'],
  },
  {
    id: 'research-tool',
    kind: 'tool',
    providerId: 'tool-runtime',
    name: 'Research Tool',
    capabilities: ['research'],
    deploymentTargets: ['palladium-cloud'],
  },
  {
    id: 'private-compute',
    kind: 'compute',
    providerId: 'compute-runtime',
    name: 'Private Compute',
    capabilities: ['batch-compute'],
    deploymentTargets: ['on-prem'],
  },
]

const orchestrator = new AiHubOrchestrator(() => capabilities)

describe('Blackstar Intelligence', () => {
  it('assembles a multi-capability goal into ordered governed stages', () => {
    const plan = planBlackstarIntelligence({
      id: 'goal-1',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      goal: 'Research, reason and run private analysis',
      needs: [
        {
          id: 'research',
          goal: 'Gather evidence',
          capabilities: ['research'],
          preferredKinds: ['tool'],
        },
        {
          id: 'reason',
          goal: 'Reason over the evidence',
          capabilities: ['reasoning'],
          preferredKinds: ['model'],
          dependsOn: ['research'],
        },
        {
          id: 'compute',
          goal: 'Run governed private analysis',
          capabilities: ['batch-compute'],
          preferredKinds: ['compute'],
          dependsOn: ['reason'],
          requirements: {
            requirePrivateExecution: true,
            requiredDeploymentTargets: ['on-prem'],
            requireHumanApproval: true,
          },
        },
      ],
    }, orchestrator)

    expect(plan?.stages.map((stage) => stage.id)).toEqual(['research', 'reason', 'compute'])
    expect(plan?.capabilityIds).toEqual(['private-compute', 'reasoner', 'research-tool'])
    expect(plan?.providerIds).toEqual(['compute-runtime', 'model-gateway', 'tool-runtime'])
    expect(plan?.requiresApproval).toBe(true)
    expect(plan?.policyChecks).toContain('approval-propagation')
  })

  it('fails closed when any required capability cannot be planned', () => {
    expect(planBlackstarIntelligence({
      id: 'goal-2',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      goal: 'Use an unavailable capability',
      needs: [{ id: 'missing', goal: 'Do missing work', capabilities: ['not-installed'] }],
    }, orchestrator)).toBeNull()
  })

  it('fails closed when dependencies are out of order or unknown', () => {
    expect(planBlackstarIntelligence({
      id: 'goal-3',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      goal: 'Invalid dependency graph',
      needs: [
        { id: 'reason', goal: 'Reason', capabilities: ['reasoning'], dependsOn: ['research'] },
        { id: 'research', goal: 'Research', capabilities: ['research'] },
      ],
    }, orchestrator)).toBeNull()
  })

  it('fails closed for duplicate stage identities', () => {
    expect(planBlackstarIntelligence({
      id: 'goal-4',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      goal: 'Invalid duplicate stages',
      needs: [
        { id: 'same', goal: 'Research', capabilities: ['research'] },
        { id: 'same', goal: 'Reason', capabilities: ['reasoning'] },
      ],
    }, orchestrator)).toBeNull()
  })
})
