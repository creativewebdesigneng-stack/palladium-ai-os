import { describe, expect, it } from 'vitest'
import { createAiHubApprovalGate } from '../approval.server'
import type { AiHubOrchestrationPlan } from '../orchestrator'

const plan: AiHubOrchestrationPlan = {
  workloadId: 'workload-1',
  discovery: [],
  requiresApproval: true,
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
    policyChecks: ['approval-required'],
  },
}

describe('AI Hub durable approval gate', () => {
  it('creates a real owner-scoped approval request without persisting execution input', async () => {
    let inserted: Record<string, unknown> | undefined
    const db = {
      from: () => ({
        insert(row: Record<string, unknown>) { inserted = row; return this },
        select() { return this },
        eq() { return this },
        in() { return this },
        is() { return this },
        async maybeSingle() { return { data: inserted ? { id: 'approval-1' } : null, error: null } },
      }),
    }

    const id = await createAiHubApprovalGate(db).request(plan, {
      tenantId: 'tenant-1', actorId: 'actor-1', input: { secret: 'do-not-store' },
    })

    expect(id).toBe('approval-1')
    expect(inserted).toMatchObject({
      user_id: 'actor-1', org_id: null, action_type: 'ai_hub_execution', status: 'pending',
      details: {
        ai_hub_workload_id: 'workload-1',
        ai_hub_provider_id: 'palladium-model-gateway',
        ai_hub_capability_id: 'reasoner',
      },
    })
    expect(JSON.stringify(inserted)).not.toContain('do-not-store')
  })

  it('atomically claims resume only through the matching actor, scope, workload, provider and capability', async () => {
    const filters: Array<[string, unknown]> = []
    const db = {
      from: () => ({
        update() { return this },
        select() { return this },
        eq(column: string, value: unknown) { filters.push([column, value]); return this },
        is(column: string, value: unknown) { filters.push([column, value]); return this },
        async maybeSingle() { return { data: { id: 'approval-1' }, error: null } },
      }),
    }

    const approved = await createAiHubApprovalGate(db).claim(
      plan, { tenantId: 'tenant-1', actorId: 'actor-1' }, 'approval-1',
    )

    expect(approved).toBe(true)
    expect(filters).toEqual(expect.arrayContaining([
      ['id', 'approval-1'], ['user_id', 'actor-1'], ['org_id', null],
      ['status', 'approved'], ['execution_status', null],
      ['details->>ai_hub_workload_id', 'workload-1'],
      ['details->>ai_hub_provider_id', 'palladium-model-gateway'],
      ['details->>ai_hub_capability_id', 'reasoner'],
    ]))
  })
})
