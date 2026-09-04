import { describe, expect, it } from 'vitest'
import {
  validateWorkspaceCollaborationInput,
  validateWorkspaceGraphInput,
} from '../shared-intelligence.functions'

describe('shared workspace intelligence inputs', () => {
  it('accepts bounded graph controls', () => {
    const value = validateWorkspaceGraphInput({ minConfidence: 0.7, maxNodes: 200, maxEdges: 500 })
    expect(value.minConfidence).toBe(0.7)
    expect(value.maxNodes).toBe(200)
  })

  it('rejects graph limits outside governed bounds', () => {
    expect(() => validateWorkspaceGraphInput({ maxNodes: 501 })).toThrow()
    expect(() => validateWorkspaceGraphInput({ minConfidence: 2 })).toThrow()
  })

  it('accepts collaboration actions with explicit agent policy', () => {
    const value = validateWorkspaceCollaborationInput({
      members: [{ id: 'agent-1', kind: 'agent', role: 'agent' }],
      requests: [{ actorId: 'agent-1', action: 'edit', resourceId: 'card-1' }],
      allowAgentEdits: true,
      requireHumanApprovalForAgentMutations: true,
    })
    expect(value.requests[0]?.action).toBe('edit')
    expect(value.requireHumanApprovalForAgentMutations).toBe(true)
  })

  it('rejects unbounded or invalid collaboration requests', () => {
    expect(() => validateWorkspaceCollaborationInput({ members: [], requests: [] })).toThrow()
    expect(() => validateWorkspaceCollaborationInput({ members: [], requests: [{ actorId: 'x', action: 'destroy' }] })).toThrow()
  })
})
