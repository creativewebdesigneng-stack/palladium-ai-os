import { beforeEach, describe, expect, it, vi } from 'vitest'

const orchestrator = vi.hoisted(() => ({ plan: vi.fn() }))
const workforce = vi.hoisted(() => ({ execute: vi.fn() }))
vi.mock('../orchestrator.server', () => ({ planOrchestratedGoal: orchestrator.plan }))
vi.mock('../workforce.server', () => ({ executeWorkflow: workforce.execute }))

import {
  BLACKSTAR_ASTRA_DELEGATION_MARKER,
  runBlackstarAstraOrchestrationTool,
} from '../blackstar-astra-orchestration-tool.server'
import { buildBlackstarAstraRunCapabilityControl } from '../blackstar-astra-capability-control'

function context(taskInput = 'Root Astra objective') {
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => ({ data: { input: taskInput }, error: null }))
  const sb = { from: vi.fn(() => chain) }
  return {
    userId: 'user-1',
    orgId: 'org-1',
    agentId: 'astra-agent',
    taskId: 'task-1',
    sb,
  }
}

describe('Blackstar Astra orchestration bridge', () => {
  beforeEach(() => {
    orchestrator.plan.mockReset()
    workforce.execute.mockReset()
  })

  it('hands a bounded root objective to the existing Orchestrator and Workforce engine', async () => {
    orchestrator.plan.mockResolvedValue({
      workflow: { id: 'workflow-1', name: 'Orchestrated objective' },
      goal: `Research and analyse the launch\n\n${BLACKSTAR_ASTRA_DELEGATION_MARKER}`,
      plan: { assignments: [] },
    })
    workforce.execute.mockResolvedValue({
      run: { id: 'run-1', status: 'succeeded' },
      output: 'verified synthesis',
      steps: [
        { step_id: 'step-1', name: 'Research', agent_id: 'agent-a', status: 'succeeded', output: 'research evidence' },
        { step_id: 'step-2', name: 'Analyse', agent_id: 'agent-b', status: 'succeeded', output: 'analysis evidence' },
      ],
    })
    const ctx = context()

    const result = await runBlackstarAstraOrchestrationTool({
      objective: 'Research and analyse the launch',
      workforce_id: 'workforce-1',
    }, ctx) as Record<string, any>

    expect(orchestrator.plan).toHaveBeenCalledWith(expect.objectContaining({
      sb: ctx.sb,
      userId: 'user-1',
      orgId: 'org-1',
      workforceId: 'workforce-1',
      maxAssignments: 4,
    }))
    expect(String(orchestrator.plan.mock.calls[0]?.[0]?.goal)).toContain(BLACKSTAR_ASTRA_DELEGATION_MARKER)
    expect(workforce.execute).toHaveBeenCalledWith(expect.objectContaining({
      sb: ctx.sb,
      userId: 'user-1',
      workflowId: 'workflow-1',
      trigger: 'blackstar_astra_orchestrator_tool',
    }))
    expect(result).toMatchObject({
      orchestrated: true,
      workflow_id: 'workflow-1',
      status: 'succeeded',
      multi_agent: true,
      participating_agent_ids: ['agent-a', 'agent-b'],
      execution_authority: 'existing_blackstar_workforce_policy',
    })
  })

  it('blocks recursive Astra orchestration from delegated child tasks before planning', async () => {
    const ctx = context(`Child assignment\n${BLACKSTAR_ASTRA_DELEGATION_MARKER}`)
    const result = await runBlackstarAstraOrchestrationTool({ objective: 'Delegate again' }, ctx)

    expect(result).toEqual(expect.objectContaining({
      policy_code: 'ASTRA_ORCHESTRATION_DEPTH_LIMIT',
    }))
    expect(orchestrator.plan).not.toHaveBeenCalled()
    expect(workforce.execute).not.toHaveBeenCalled()
  })

  it('reports multi-agent capability only when the explicit orchestration bridge is granted', () => {
    const withoutBridge = buildBlackstarAstraRunCapabilityControl(['calculator'])
    expect(withoutBridge.available).not.toContain('multi_agent')
    expect(withoutBridge.unavailable_target_capabilities).toContain('multi_agent')

    const withBridge = buildBlackstarAstraRunCapabilityControl(['astra_orchestrate'])
    expect(withBridge.available).toContain('multi_agent')
    expect(withBridge.unavailable_target_capabilities).not.toContain('multi_agent')
  })
})
