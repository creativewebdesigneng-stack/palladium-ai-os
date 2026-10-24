import { describe, expect, it, vi } from 'vitest'

const privilegedWriter=vi.hoisted(()=>({
  from: (_table:string): unknown => { throw new Error('Privileged approval writer was not mocked.') },
}))
vi.mock('@/integrations/supabase/client.server',()=>({
  supabaseAdmin:privilegedWriter,
}))

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
    expect((inserted?.['details'] as Record<string, unknown>)?.['ai_hub_input_fingerprint']).toMatch(/^[a-f0-9]{64}$/)
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

    // The claim is made through the backend writer, not the caller's client.
    privilegedWriter.from=db.from

    const approved = await createAiHubApprovalGate(db).claim(
      plan, { tenantId: 'tenant-1', actorId: 'actor-1', input: 'authorised task' }, 'approval-1',
    )

    expect(approved).toBe(true)
    expect(filters).toEqual(expect.arrayContaining([
      ['id', 'approval-1'], ['user_id', 'actor-1'], ['org_id', null],
      ['status', 'approved'], ['execution_status', null],
      ['details->>ai_hub_workload_id', 'workload-1'],
      ['details->>ai_hub_provider_id', 'palladium-model-gateway'],
      ['details->>ai_hub_capability_id', 'reasoner'],
      ['details->>ai_hub_input_fingerprint', expect.stringMatching(/^[0-9a-f]{64}$/)],
    ]))
  })
  it('rejects a changed objective while permitting an identical JSON input with reordered keys', async () => {
    let inserted: Record<string, any> | undefined
    const db = {
      from: () => ({
        select() { return this },
        eq() { return this },
        is() { return this },
        in() { return this },
        insert(row: Record<string, any>) { inserted = row; return this },
        async maybeSingle() { return { data: inserted ? { id: 'approval-bound' } : null, error: null } },
      }),
    }
    const gate = createAiHubApprovalGate(db)
    await gate.request(plan, {
      tenantId: 'tenant-1', actorId: 'actor-1',
      input: { objective: 'approved', options: { alpha: true, beta: 2 } },
    })
    const approvedFingerprint = (inserted?.['details'] as Record<string, unknown>)?.['ai_hub_input_fingerprint']
    expect(approvedFingerprint).toMatch(/^[a-f0-9]{64}$/)

    let matchedFingerprint = false
    privilegedWriter.from = () => ({
      update() { return this },
      eq(key: string, value: unknown) {
        if (key === 'details->>ai_hub_input_fingerprint') {
          matchedFingerprint = value === approvedFingerprint
        }
        return this
      },
      is() { return this },
      select() { return this },
      async maybeSingle() {
        return { data: matchedFingerprint ? { id: 'approval-bound' } : null, error: null }
      },
    })

    const changed = await gate.claim(plan, {
      tenantId: 'tenant-1', actorId: 'actor-1',
      input: { objective: 'different', options: { alpha: true, beta: 2 } },
    }, 'approval-bound')
    expect(changed).toBe(false)

    const unchanged = await gate.claim(plan, {
      tenantId: 'tenant-1', actorId: 'actor-1',
      input: { options: { beta: 2, alpha: true }, objective: 'approved' },
    }, 'approval-bound')
    expect(unchanged).toBe(true)
  })

  it('persists exact approved gateway completion only when the updated receipt is returned', async () => {
    const filters: Array<[string, unknown]> = []
    let update: Record<string, unknown> | undefined
    privilegedWriter.from = () => ({
      update(values: Record<string, unknown>) { update = values; return this },
      select() { return this },
      eq(key: string, value: unknown) { filters.push([key, value]); return this },
      is(key: string, value: unknown) { filters.push([key, value]); return this },
      async maybeSingle() { return { data: { id: 'approval-1' }, error: null } },
    })
    await createAiHubApprovalGate({ from: () => ({}) }).complete('approval-1', {
      tenantId: 'tenant-1', actorId: 'actor-1', approvalOrgId: null,
    }, { status: 'completed', adapter: 'model-gateway' })
    expect(update).toMatchObject({
      execution_status: 'succeeded',
      execution_error: null,
      execution_result: { adapter: 'model-gateway' },
    })
    expect(typeof update?.['executed_at']).toBe('string')
    expect(filters).toEqual(expect.arrayContaining([
      ['id', 'approval-1'], ['user_id', 'actor-1'],
      ['action_type', 'ai_hub_execution'], ['status', 'approved'],
      ['execution_status', 'executing'], ['org_id', null],
    ]))
  })

  it('records failed gateway attempts but never acknowledges revoked or missing approvals', async () => {
    let persisted: Record<string, unknown> | undefined
    let returnedId: string | null = 'approval-2'
    privilegedWriter.from = () => ({
      update(values: Record<string, unknown>) { persisted = values; return this },
      select() { return this },
      eq() { return this },
      is() { return this },
      async maybeSingle() { return { data: returnedId ? { id: returnedId } : null, error: null } },
    })
    const gate = createAiHubApprovalGate({ from: () => ({}) })
    const context = { tenantId: 'tenant-1', actorId: 'actor-1' }
    await gate.complete('approval-2', context, {
      status: 'failed', adapter: 'agent-runtime', error: 'Nested approval still pending',
    })
    expect(persisted).toMatchObject({
      execution_status: 'failed', execution_error: 'Nested approval still pending',
    })
    returnedId = null
    await expect(gate.complete('approval-2', context, {
      status: 'completed', adapter: 'agent-runtime',
    })).rejects.toThrow('not recorded against the approved execution')
    returnedId = 'different-approval'
    await expect(gate.complete('approval-2', context, {
      status: 'completed', adapter: 'agent-runtime',
    })).rejects.toThrow('not recorded against the approved execution')
  })

  it('fails closed if approval input is missing or non-serialisable', async () => {
    const db = { from: () => ({}) }
    const gate = createAiHubApprovalGate(db)
    await expect(gate.request(plan, { tenantId: 'tenant-1', actorId: 'actor-1' }))
      .rejects.toThrow('JSON-serialisable')
    await expect(gate.claim(plan, { tenantId: 'tenant-1', actorId: 'actor-1' }, 'approval-1'))
      .rejects.toThrow('JSON-serialisable')
    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    await expect(gate.request(plan, { tenantId: 'tenant-1', actorId: 'actor-1', input: cyclic }))
      .rejects.toThrow('cannot contain cycles')
  })

})
