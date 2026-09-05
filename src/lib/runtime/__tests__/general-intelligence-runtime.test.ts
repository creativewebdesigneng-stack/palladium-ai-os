import { describe, expect, it, vi } from 'vitest'
import { applyGeneralIntelligenceControl } from '../general-intelligence-runtime.server'
import type { PreparedRun } from '../runtime.server'

function run(overrides: Partial<PreparedRun['agent']> = {}): PreparedRun {
  return {
    agent: {
      id: 'agent-1',
      user_id: 'user-1',
      org_id: null,
      org_id_fk: null,
      name: 'Operator Agent',
      description: null,
      purpose: 'Research and analyse evidence',
      personality: null,
      instructions: null,
      system_prompt: null,
      model_provider: 'openai',
      model: 'test-model',
      temperature: null,
      max_tokens: null,
      memory_enabled: true,
      allowed_tools: ['web_search'],
      allowed_providers: [],
      requires_approval: false,
      autonomy: 'assist',
      status: 'active',
      category: 'research',
      ...overrides,
    },
    orgId: null,
    taskId: 'task-1',
    messages: [
      { role: 'system', content: 'BASE SYSTEM' },
      { role: 'user', content: 'Research the market and analyse the findings' },
    ],
    tools: {} as PreparedRun['tools'],
    provider: 'openai' as PreparedRun['provider'],
    model: 'test-model',
    startedAt: Date.now(),
  }
}

function sbWithAgents(rows: Array<Record<string, unknown>>) {
  const limit = vi.fn(async () => ({ data: rows, error: null }))
  const neq = vi.fn(() => ({ limit }))
  const select = vi.fn(() => ({ neq }))
  const from = vi.fn(() => ({ select }))
  return { sb: { from }, from, select, neq, limit }
}

describe('general intelligence runtime control', () => {
  it('injects the control after the existing system context and uses authorised candidates', async () => {
    const { sb, from } = sbWithAgents([
      {
        id: 'agent-1',
        name: 'Operator Agent',
        category: 'research',
        purpose: 'Research evidence',
        allowed_tools: ['web_search'],
        model_provider: 'openai',
        model: 'test-model',
        status: 'active',
      },
      {
        id: 'agent-2',
        name: 'Analysis Agent',
        category: 'analysis',
        purpose: 'Analyse and forecast data',
        allowed_tools: [],
        model_provider: 'openai',
        model: 'test-model',
        status: 'active',
      },
    ])

    const result = await applyGeneralIntelligenceControl({
      sb,
      run: run(),
      input: 'Research the market and analyse the findings',
    })

    expect(from).toHaveBeenCalledWith('personal_agents')
    expect(result.run.messages[0]?.content).toBe('BASE SYSTEM')
    expect(result.run.messages[1]?.content).toContain('BLACKSTAR GENERAL INTELLIGENCE CONTROL')
    expect(result.run.messages[1]?.content).toContain('Runtime binding: this execution remains bound to agent agent-1')
    expect(result.assessment.goal.domains).toEqual(expect.arrayContaining(['research', 'analysis']))
    expect(result.assessment.selected_agent_ids).toContain('agent-1')
    expect(result.assessment.requires_verification).toBe(true)
  })

  it('preserves approval boundaries from the active agent', async () => {
    const { sb } = sbWithAgents([])
    const result = await applyGeneralIntelligenceControl({
      sb,
      run: run({ requires_approval: true, autonomy: 'approval_required' }),
      input: 'Prepare a customer operations workflow',
    })

    expect(result.assessment.requires_approval).toBe(true)
    expect(result.run.messages[1]?.content).toContain('Approval required: yes')
  })

  it('falls back to the current authorised agent when catalogue discovery fails', async () => {
    const limit = vi.fn(async () => ({ data: null, error: new Error('catalogue unavailable') }))
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          neq: vi.fn(() => ({ limit })),
        })),
      })),
    }

    const result = await applyGeneralIntelligenceControl({
      sb,
      run: run(),
      input: 'Research competitors',
    })

    expect(result.assessment.selected_agent_ids).toEqual(['agent-1'])
    expect(result.run.messages[1]?.content).toContain('Selected authorised agents: agent-1')
  })
})
