import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { agentGatewayOutcome, workflowGatewayOutcome, confirmPersistedAiHubRuntimeOutcome } from '../runtime-outcome'

describe('AI Hub gateway must verify persisted runtime completion', () => {
  it('accepts only a genuinely succeeded agent task', () => {
    expect(agentGatewayOutcome({ task: { id: 'a', status: 'succeeded' }, output: 'done' })).toEqual({ status: 'completed' })
    for (const status of ['waiting_for_approval', 'awaiting_approval', 'running', 'queued', 'failed', 'cancelled']) {
      const result = agentGatewayOutcome({ task: { id: 'a', status }, output: status === 'waiting_for_approval' ? '' : 'model text' })
      expect(result.status).toBe('failed')
      expect(result).toHaveProperty('error')
    }
    expect(agentGatewayOutcome({ output: 'prose only' }).status).toBe('failed')
    expect(agentGatewayOutcome(null).status).toBe('failed')
  })

  it('accepts only a genuinely succeeded workforce run, not an approval pause or failed step', () => {
    expect(workflowGatewayOutcome({ run: { id: 'w', status: 'succeeded' } })).toEqual({ status: 'completed' })
    for (const status of ['waiting_for_approval', 'awaiting_approval', 'running', 'queued', 'failed', 'cancelled']) {
      const result = workflowGatewayOutcome({ run: { id: 'w', status }, steps: [{ status: 'succeeded' }] })
      expect(result.status).toBe('failed')
    }
    expect(workflowGatewayOutcome({ paused: true }).status).toBe('failed')
    expect(workflowGatewayOutcome({ output: 'nonempty but no run' }).status).toBe('failed')
  })

  it('leaves nested paused work in its own task/workforce boundary and returns an actionable error', () => {
    const pausedAgent = agentGatewayOutcome({ task: { status: 'waiting_for_approval' }, output: '' })
    const pausedWorkflow = workflowGatewayOutcome({ run: { status: 'waiting_for_approval' }, paused: true })
    expect(pausedAgent.status).toBe('failed')
    expect(pausedAgent).toMatchObject({ error: expect.stringContaining('Agent Tasks') })
    expect(pausedWorkflow).toMatchObject({ error: expect.stringContaining('Workforce') })
  })


  it('requires owner-scoped canonical database confirmation before treating a returned task as completed', async () => {
    const filters: Array<[string, unknown]> = []
    const tables: string[] = []
    const query = {
      select(_columns: string) { return this },
      eq(key: string, value: unknown) { filters.push([key, value]); return this },
      async maybeSingle() { return { data: { id: 'task-123', status: 'succeeded' }, error: null } },
    }
    const sb = { from(table: string) { tables.push(table); return query } }
    expect(await confirmPersistedAiHubRuntimeOutcome({
      sb, userId: 'owner-one', resourceId: 'agent-one', kind: 'agent',
      runtime: { task: { id: 'task-123', status: 'succeeded' }, output: 'deliverable' },
    })).toEqual({ status: 'completed' })
    expect(tables).toEqual(['agent_tasks'])
    expect(filters).toEqual([['id', 'task-123'], ['user_id', 'owner-one'], ['agent_id', 'agent-one']])
  })

  it('requires matching persisted workflow ownership and success; rejects fallback and stale read results', async () => {
    const filters: Array<[string, unknown]> = []
    const tables: string[] = []
    const query = {
      select(_columns: string) { return this },
      eq(key: string, value: unknown) { filters.push([key, value]); return this },
      async maybeSingle() { return { data: { id: 'workflow-run-1', status: 'succeeded' }, error: null } },
    }
    const sb = { from(table: string) { tables.push(table); return query } }
    const args = {
      sb, userId: 'owner-two', resourceId: 'workflow-two', kind: 'workflow' as const,
      runtime: { run: { id: 'workflow-run-1', status: 'succeeded' } },
    }
    expect(await confirmPersistedAiHubRuntimeOutcome(args)).toEqual({ status: 'completed' })
    expect(tables).toEqual(['workflow_runs'])
    expect(filters).toEqual([['id', 'workflow-run-1'], ['user_id', 'owner-two'], ['workflow_id', 'workflow-two']])
    const wrong = { from: () => ({
      select() { return this }, eq() { return this },
      async maybeSingle() { return { data: { id: 'another-run', status: 'succeeded' }, error: null } },
    }) }
    expect((await confirmPersistedAiHubRuntimeOutcome({ ...args, sb: wrong })).status).toBe('failed')
  })

  it('fails closed when persistence is missing, disagrees, or cannot be checked', async () => {
    const missing = { from: () => ({
      select() { return this }, eq() { return this },
      async maybeSingle() { return { data: null, error: null } },
    }) }
    const args = {
      sb: missing, userId: 'owner', resourceId: 'agent',
      kind: 'agent' as const, runtime: { task: { id: 't', status: 'succeeded' } },
    }
    expect((await confirmPersistedAiHubRuntimeOutcome(args)).status).toBe('failed')
    expect((await confirmPersistedAiHubRuntimeOutcome({ ...args, runtime: { task: { status: 'succeeded' } } })).status).toBe('failed')
    const errored = { from: () => {
      throw new Error('Database unavailable')
    } }
    expect((await confirmPersistedAiHubRuntimeOutcome({ ...args, sb: errored })).status).toBe('failed')
    const unfinished = { from: () => {
      throw new Error('Should not read for a paused task')
    } }
    const paused = await confirmPersistedAiHubRuntimeOutcome({
      ...args, sb: unfinished, runtime: { task: { id: 't', status: 'waiting_for_approval' } },
    })
    expect(paused).toMatchObject({ status: 'failed', error: expect.stringContaining('Agent Tasks') })
  })

  it('preserves the existing approval gateway and does not add a bypass or extra dispatcher', () => {
    const source = readFileSync(new URL('../execution.functions.ts', import.meta.url), 'utf8')
    expect(source).toContain('const runtime = await executeAgentTask(')
    expect(source).toContain('const runtime = await executeWorkflow(')
    expect(source).toContain("kind: 'agent', runtime")
    expect(source).toContain("kind: 'workflow', runtime")
    expect(source).toContain('createAiHubApprovalGate(sb)')
    expect(source).not.toContain("return { status: 'completed', adapter: 'agent-runtime' }")
    expect(source).not.toContain("return { status: 'completed', adapter: 'workflows' }")
  })

  it('shows failed adapter responses instead of suppressing them as successful mutations', () => {
    const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8')
    expect(screen).toContain("execution.data?.status==='failed'")
    expect(screen).toContain("mcpExecution.data?.status==='failed'")
    expect(screen).toContain("execution.data.error || 'The Hub action did not complete.")
    expect(screen).toContain("mcpExecution.data.error || 'The MCP tool did not complete.")
  })
})
