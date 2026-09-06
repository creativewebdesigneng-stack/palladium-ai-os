import { describe, expect, it, vi } from 'vitest'

const workflow = vi.hoisted(() => ({ queue: vi.fn() }))
vi.mock('../workflow-queue.server', () => ({ queueWorkflowRun: workflow.queue }))

import { runBlackstarAstraAsyncWorkflowTool } from '../blackstar-astra-async-workflow-tool.server'
import { buildBlackstarAstraRunCapabilityControl } from '../blackstar-astra-capability-control'

describe('Blackstar Astra async workflow tool', () => {
  it('queues only an existing workflow through the authoritative durable worker path', async () => {
    workflow.queue.mockResolvedValue({
      run: { id: 'run-1', status: 'queued', queued_at: '2026-09-06T13:45:00.000Z' },
    })
    const sb = { from: vi.fn() }
    const result = await runBlackstarAstraAsyncWorkflowTool({
      workflow_id: 'workflow-1',
      objective: 'Research the account and prepare the bounded deliverable.',
    }, {
      userId: 'user-1',
      orgId: null,
      agentId: 'agent-1',
      taskId: 'task-1',
      sb,
    }) as Record<string, unknown>

    expect(workflow.queue).toHaveBeenCalledWith({
      sb,
      userId: 'user-1',
      workflowId: 'workflow-1',
      input: 'Research the account and prepare the bounded deliverable.',
      trigger: 'blackstar_astra_async_tool',
    })
    expect(result).toMatchObject({
      queued: true,
      workflow_run_id: 'run-1',
      status: 'queued',
      durable: true,
      execution_authority: 'existing_workflow_policy',
    })
  })

  it('fails locally when workflow identity or objective is missing', async () => {
    workflow.queue.mockClear()
    const ctx = {
      userId: 'user-1',
      orgId: null,
      agentId: 'agent-1',
      taskId: 'task-1',
      sb: { from: vi.fn() },
    }
    await expect(runBlackstarAstraAsyncWorkflowTool({ workflow_id: '', objective: 'x' }, ctx)).resolves.toEqual({ error: 'workflow_id is required.' })
    await expect(runBlackstarAstraAsyncWorkflowTool({ workflow_id: 'wf', objective: '' }, ctx)).resolves.toEqual({ error: 'objective is required.' })
    expect(workflow.queue).not.toHaveBeenCalled()
  })

  it('advertises async tools only when the explicit Astra workflow tool is already granted', () => {
    const withoutAsync = buildBlackstarAstraRunCapabilityControl(['calculator'])
    expect(withoutAsync.available).not.toContain('async_tools')
    expect(withoutAsync.unavailable_target_capabilities).toContain('async_tools')

    const withAsync = buildBlackstarAstraRunCapabilityControl(['astra_async_workflow'])
    expect(withAsync.available).toContain('async_tools')
    expect(withAsync.unavailable_target_capabilities).not.toContain('async_tools')
  })
})
