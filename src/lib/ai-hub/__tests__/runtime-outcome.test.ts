import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { agentGatewayOutcome, workflowGatewayOutcome } from '../runtime-outcome'

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

  it('preserves the existing approval gateway and does not add a bypass or extra dispatcher', () => {
    const source = readFileSync(new URL('../execution.functions.ts', import.meta.url), 'utf8')
    expect(source).toContain('const runtime = await executeAgentTask(')
    expect(source).toContain('const runtime = await executeWorkflow(')
    expect(source).toContain('agentGatewayOutcome(runtime)')
    expect(source).toContain('workflowGatewayOutcome(runtime)')
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
