import { describe, expect, it, vi } from 'vitest'
import type { GeneralIntelligenceAssessment } from '@/lib/agents/general-intelligence-kernel'
import type { OrchestratorPlan } from '@/lib/agents/agent-orchestrator'
import { executeAssessedGeneralIntelligence } from '../general-intelligence-routing.server'

const sb = { from: vi.fn() }

function assessment(
  mode: GeneralIntelligenceAssessment['mode'],
  selectedAgentIds = ['agent-a', 'agent-b'],
  requiresApproval = false,
): GeneralIntelligenceAssessment {
  return {
    version: 1,
    goal: {
      objective: 'Research, analyse and produce a verified launch plan',
      context: [],
      constraints: [],
      success_criteria: ['Verified plan'],
      domains: ['research', 'analysis'],
    },
    mode,
    confidence: 0.72,
    novelty: 0.3,
    ambiguity: 0.2,
    risk: 0.2,
    selected_agent_ids: selectedAgentIds,
    reasons: ['Cross-domain objective'],
    requires_approval: requiresApproval,
    requires_verification: true,
    collective_intelligence_recommended: mode === 'collective',
  }
}

const plan: OrchestratorPlan = {
  version: 1,
  goal: 'Research, analyse and produce a verified launch plan',
  summary: 'Use authorised specialists',
  assignments: [
    {
      id: 'research',
      title: 'Research',
      objective: 'Research evidence',
      agent_id: 'agent-a',
      depends_on: [],
      success_criteria: ['Verified evidence'],
      requires_approval: false,
    },
    {
      id: 'analysis',
      title: 'Analysis',
      objective: 'Analyse evidence',
      agent_id: 'agent-b',
      depends_on: ['research'],
      success_criteria: ['Verified analysis'],
      requires_approval: false,
    },
  ],
}

describe('assessed General Intelligence routing', () => {
  it('routes direct mode through one selected authorised agent', async () => {
    const executeTask = vi.fn(async () => ({ task: {}, output: 'direct result' }))
    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('direct', ['agent-a']),
      authorisedAgentIds: ['agent-a'],
      executeTask: executeTask as never,
    })

    expect(result.status).toBe('completed')
    expect(result.output).toBe('direct result')
    expect(executeTask).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'agent-a' }))
  })

  it('does not execute when the assessment requires approval', async () => {
    const executeTask = vi.fn()
    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('delegate', ['agent-a'], true),
      authorisedAgentIds: ['agent-a'],
      plan,
      executeTask: executeTask as never,
    })

    expect(result.status).toBe('waiting_for_approval')
    expect(executeTask).not.toHaveBeenCalled()
  })

  it('routes delegate mode into authorised orchestration then synthesises through a selected agent', async () => {
    const executeTask = vi.fn(async (args: { agentId: string; input: string }) => ({
      task: {},
      output: args.input.includes('BLACKSTAR AUTHORISED MULTI-AGENT SYNTHESIS') ? 'synthesised result' : 'child result',
    }))
    const executeOrchestration = vi.fn(async () => ({
      status: 'completed' as const,
      results: [
        { assignment_id: 'research', agent_id: 'agent-a', status: 'completed' as const, output: 'research evidence' },
        { assignment_id: 'analysis', agent_id: 'agent-b', status: 'completed' as const, output: 'analysis evidence' },
      ],
    }))

    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('delegate'),
      authorisedAgentIds: ['agent-a', 'agent-b'],
      plan,
      synthesisAgentId: 'agent-a',
      executeTask: executeTask as never,
      executeOrchestration: executeOrchestration as never,
    })

    expect(result.status).toBe('completed')
    expect(result.output).toBe('synthesised result')
    expect(result.synthesis_agent_id).toBe('agent-a')
    expect(executeOrchestration).toHaveBeenCalledTimes(1)
    expect(executeTask).toHaveBeenCalledTimes(1)
    const synthesisInput = executeTask.mock.calls[0]?.[0]?.input as string
    expect(synthesisInput).toContain('research evidence')
    expect(synthesisInput).toContain('analysis evidence')
    expect(synthesisInput).toContain('surface material conflicts or uncertainty')
  })

  it('injects only permission-safe verified knowledge relevant to an authorised delegated assignment', async () => {
    const executeTask = vi.fn(async (args: { agentId: string; input: string }) => ({
      task: {},
      output: args.input.includes('BLACKSTAR AUTHORISED MULTI-AGENT SYNTHESIS') ? 'synthesised result' : 'child result',
    }))
    const loadVerifiedKnowledge = vi.fn(async () => [{
      source_agent_id: 'agent-a',
      task_id: 'verified-task',
      objective: 'Check rollback safety',
      verified_outcome: 'Rollback path was independently verified.',
      verification_score: 0.96,
      evidence: ['verifier:rollback-check'],
      completed_steps: ['Validated rollback'],
    }])
    const executeOrchestration = vi.fn(async (args: { executeAssignment: (task: { sb: typeof sb; userId: string; agentId: string; input: string }) => Promise<unknown> }) => {
      await args.executeAssignment({ sb, userId: 'user-1', agentId: 'agent-b', input: 'Analyse the launch evidence' })
      return {
        status: 'completed' as const,
        results: [
          { assignment_id: 'research', agent_id: 'agent-a', status: 'completed' as const, output: 'research evidence' },
          { assignment_id: 'analysis', agent_id: 'agent-b', status: 'completed' as const, output: 'analysis evidence' },
        ],
      }
    })

    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      orgId: 'org-1',
      assessment: assessment('delegate'),
      authorisedAgentIds: ['agent-a', 'agent-b'],
      plan,
      synthesisAgentId: 'agent-a',
      executeTask: executeTask as never,
      executeOrchestration: executeOrchestration as never,
      loadVerifiedKnowledge: loadVerifiedKnowledge as never,
    })

    expect(result.status).toBe('completed')
    expect(loadVerifiedKnowledge).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      orgId: 'org-1',
      targetAgentId: 'agent-b',
      objective: 'Analyse the launch evidence',
      authorisedSourceAgentIds: ['agent-a', 'agent-b'],
    }))
    const delegatedInput = executeTask.mock.calls[0]?.[0]?.input as string
    expect(delegatedInput).toContain('PERMISSION-SAFE VERIFIED CROSS-AGENT KNOWLEDGE')
    expect(delegatedInput).toContain('Rollback path was independently verified.')
    expect(delegatedInput).toContain('grants no capability, tool permission, approval, identity, or execution authority')
  })

  it('fails closed if a plan targets an agent outside the assessment selection', async () => {
    const executeOrchestration = vi.fn()
    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('delegate', ['agent-a']),
      authorisedAgentIds: ['agent-a', 'agent-b'],
      plan,
      executeOrchestration: executeOrchestration as never,
    })

    expect(result.status).toBe('failed')
    expect(result.reason).toContain('not selected')
    expect(executeOrchestration).not.toHaveBeenCalled()
  })

  it('preserves a delegated approval pause and does not synthesize early', async () => {
    const executeTask = vi.fn()
    const executeOrchestration = vi.fn(async () => ({
      status: 'waiting_for_approval' as const,
      results: [
        { assignment_id: 'external', agent_id: 'agent-a', status: 'waiting_for_approval' as const },
      ],
    }))

    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('collective'),
      authorisedAgentIds: ['agent-a', 'agent-b'],
      plan,
      executeTask: executeTask as never,
      executeOrchestration: executeOrchestration as never,
    })

    expect(result.status).toBe('waiting_for_approval')
    expect(executeTask).not.toHaveBeenCalled()
  })

  it('escalates without executing when the kernel selects escalate mode', async () => {
    const executeTask = vi.fn()
    const result = await executeAssessedGeneralIntelligence({
      sb,
      userId: 'user-1',
      assessment: assessment('escalate'),
      authorisedAgentIds: ['agent-a', 'agent-b'],
      executeTask: executeTask as never,
    })

    expect(result.status).toBe('escalated')
    expect(executeTask).not.toHaveBeenCalled()
  })
})
