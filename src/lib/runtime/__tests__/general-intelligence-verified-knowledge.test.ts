import { describe, expect, it, vi } from 'vitest'
import { loadPermissionSafeVerifiedKnowledge } from '../general-intelligence-verified-knowledge.server'

const row = {
  user_id: 'user-1',
  org_id: 'org-1',
  agent_id: 'agent-a',
  task_id: 'task-1',
  category: 'verified_experience',
  source: 'agent_verifier',
  metadata: {
    kind: 'verified_experience',
    objective: 'Validate launch safety',
    verified_outcome: 'Rollback was verified.',
    verification_score: 0.95,
    evidence: ['verifier:rollback'],
    completed_steps: ['Validated rollback'],
  },
}

function queryWith(data: unknown[]) {
  const query: Record<string, any> = {}
  for (const method of ['select', 'eq', 'in', 'order', 'limit', 'is']) {
    query[method] = vi.fn(() => query)
  }
  query['then'] = (resolve: (value: unknown) => void) => resolve({ data, error: null })
  return query
}

describe('General Intelligence verified knowledge loader', () => {
  it('selects metadata only and applies owner, organisation and authorised-source filters', async () => {
    const query = queryWith([row])
    const sb = { from: vi.fn(() => query) }

    const result = await loadPermissionSafeVerifiedKnowledge({
      sb,
      userId: 'user-1',
      orgId: 'org-1',
      targetAgentId: 'agent-b',
      authorisedSourceAgentIds: ['agent-a', 'agent-b'],
    })

    expect(sb.from).toHaveBeenCalledWith('agent_memories')
    expect(query['select']).toHaveBeenCalledWith('user_id,org_id,agent_id,task_id,category,source,metadata')
    expect(query['select'].mock.calls[0]?.[0]).not.toContain('content')
    expect(query['eq']).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query['eq']).toHaveBeenCalledWith('org_id', 'org-1')
    expect(query['in']).toHaveBeenCalledWith('agent_id', ['agent-a'])
    expect(result).toHaveLength(1)
    expect(result[0]?.verified_outcome).toBe('Rollback was verified.')
  })

  it('uses an explicit null organisation boundary for personal-scope transfer', async () => {
    const query = queryWith([{ ...row, org_id: null }])
    const sb = { from: vi.fn(() => query) }

    await loadPermissionSafeVerifiedKnowledge({
      sb,
      userId: 'user-1',
      orgId: null,
      targetAgentId: 'agent-b',
      authorisedSourceAgentIds: ['agent-a'],
    })

    expect(query['is']).toHaveBeenCalledWith('org_id', null)
    expect(query['eq']).not.toHaveBeenCalledWith('org_id', expect.anything())
  })

  it('does not query when no independent authorised source agent exists', async () => {
    const sb = { from: vi.fn() }

    const result = await loadPermissionSafeVerifiedKnowledge({
      sb,
      userId: 'user-1',
      orgId: 'org-1',
      targetAgentId: 'agent-a',
      authorisedSourceAgentIds: ['agent-a'],
    })

    expect(result).toEqual([])
    expect(sb.from).not.toHaveBeenCalled()
  })
})
