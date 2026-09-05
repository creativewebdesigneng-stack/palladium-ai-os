import { describe, expect, it, vi } from 'vitest'
import type { OrchestratorPlan } from '@/lib/agents/agent-orchestrator'
import { executeGeneralIntelligenceOrchestration } from '../general-intelligence-orchestration.server'

const sb = { from: vi.fn() }

function plan(assignments: OrchestratorPlan['assignments']): OrchestratorPlan {
  return { version: 1, goal: 'Cross-domain objective', summary: 'Delegate safely', assignments }
}

const assignment = (
  id: string,
  agentId: string,
  dependsOn: string[] = [],
  requiresApproval = false,
): OrchestratorPlan['assignments'][number] => ({
  id,
  title: id,
  objective: `Complete ${id}`,
  agent_id: agentId,
  depends_on: dependsOn,
  success_criteria: ['Return a verified result'],
  requires_approval: requiresApproval,
})

describe('general intelligence multi-agent orchestration', () => {
  it('executes real authorised agents in dependency order and passes upstream output as evidence', async () => {
    const calls: Array<{ agentId: string; input: string }> = []
    const executeAssignment = vi.fn(async (args: { agentId: string; input: string }) => {
      calls.push(args)
      return { task: {}, output: args.agentId === 'research' ? 'Verified research evidence' : 'Final synthesis' }
    })

    const result = await executeGeneralIntelligenceOrchestration({
      sb,
      userId: 'user-1',
      plan: plan([
        assignment('research-task', 'research'),
        assignment('synthesis-task', 'writer', ['research-task']),
      ]),
      authorisedAgentIds: ['research', 'writer'],
      executeAssignment: executeAssignment as never,
    })

    expect(result.status).toBe('completed')
    expect(calls.map((call) => call.agentId)).toEqual(['research', 'writer'])
    expect(calls[1]?.input).toContain('Verified research evidence')
    expect(calls[1]?.input).toContain('Independently verify claims')
  })

  it('fails closed before execution when a plan contains an unauthorised agent', async () => {
    const executeAssignment = vi.fn()
    const result = await executeGeneralIntelligenceOrchestration({
      sb,
      userId: 'user-1',
      plan: plan([assignment('task-1', 'unknown-agent')]),
      authorisedAgentIds: ['known-agent'],
      executeAssignment: executeAssignment as never,
    })

    expect(result.status).toBe('failed')
    expect(result.results[0]?.error).toContain('not authorised')
    expect(executeAssignment).not.toHaveBeenCalled()
  })

  it('stops before an approval-marked assignment and does not bypass Mission Control', async () => {
    const executeAssignment = vi.fn()
    const result = await executeGeneralIntelligenceOrchestration({
      sb,
      userId: 'user-1',
      plan: plan([assignment('external-action', 'operator-agent', [], true)]),
      authorisedAgentIds: ['operator-agent'],
      executeAssignment: executeAssignment as never,
    })

    expect(result.status).toBe('waiting_for_approval')
    expect(result.results[0]?.status).toBe('waiting_for_approval')
    expect(executeAssignment).not.toHaveBeenCalled()
  })

  it('does not execute dependent work after an upstream agent fails', async () => {
    const executeAssignment = vi.fn(async (args: { agentId: string }) => {
      if (args.agentId === 'first') throw new Error('verification failed')
      return { task: {}, output: 'must not run' }
    })

    const result = await executeGeneralIntelligenceOrchestration({
      sb,
      userId: 'user-1',
      plan: plan([
        assignment('first-task', 'first'),
        assignment('second-task', 'second', ['first-task']),
      ]),
      authorisedAgentIds: ['first', 'second'],
      executeAssignment: executeAssignment as never,
    })

    expect(result.status).toBe('failed')
    expect(executeAssignment).toHaveBeenCalledTimes(1)
    expect(result.results[0]?.error).toContain('verification failed')
  })

  it('rejects dependencies that are not part of the authorised plan', async () => {
    const executeAssignment = vi.fn()
    const result = await executeGeneralIntelligenceOrchestration({
      sb,
      userId: 'user-1',
      plan: plan([assignment('task-1', 'agent-1', ['missing-task'])]),
      authorisedAgentIds: ['agent-1'],
      executeAssignment: executeAssignment as never,
    })

    expect(result.status).toBe('failed')
    expect(result.results[0]?.error).toContain('not part of the authorised plan')
    expect(executeAssignment).not.toHaveBeenCalled()
  })
})
