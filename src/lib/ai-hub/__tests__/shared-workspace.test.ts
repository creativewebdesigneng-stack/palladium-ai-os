import { describe, expect, it } from 'vitest'
import { buildBlackstarSharedWorkspacePlan } from '../shared-workspace'

describe('Blackstar Shared Workspace', () => {
  it('allows human collaboration and human approvals', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      [
        { actorId: 'owner', action: 'edit' },
        { actorId: 'human-2', action: 'approve' },
      ],
      {
        ownerId: 'owner',
        members: [
          { id: 'human-2', kind: 'human', role: 'collaborator' },
        ],
      },
    )

    expect(plan.executable).toBe(true)
    expect(plan.requiresApproval).toBe(false)
    expect(plan.blockedCount).toBe(0)
  })

  it('requires human approval for governed agent mutations', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      [{ actorId: 'agent-1', action: 'execute', purpose: 'run approved mission step' }],
      {
        ownerId: 'owner',
        members: [{ id: 'agent-1', kind: 'agent', role: 'agent' }],
        allowAgentExecution: true,
      },
    )

    expect(plan.executable).toBe(true)
    expect(plan.requiresApproval).toBe(true)
    expect(plan.decisions[0]?.requiresApproval).toBe(true)
  })

  it('blocks agent approvals even when the agent can execute', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      [{ actorId: 'agent-1', action: 'approve' }],
      {
        ownerId: 'owner',
        members: [{ id: 'agent-1', kind: 'agent', role: 'agent' }],
        allowAgentExecution: true,
      },
    )

    expect(plan.executable).toBe(false)
    expect(plan.blockedCount).toBe(1)
  })

  it('blocks observers from mutating workspace state', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      [{ actorId: 'observer', action: 'edit' }],
      {
        ownerId: 'owner',
        members: [{ id: 'observer', kind: 'human', role: 'observer' }],
      },
    )

    expect(plan.executable).toBe(false)
    expect(plan.decisions[0]?.allowed).toBe(false)
  })

  it('keeps external sharing disabled unless explicitly enabled', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      [{ actorId: 'owner', action: 'share' }],
      {
        ownerId: 'owner',
        members: [],
      },
    )

    expect(plan.executable).toBe(false)
    expect(plan.decisions[0]?.reason).toContain('External sharing')
  })

  it('bounds the number of evaluated workspace actions', () => {
    const plan = buildBlackstarSharedWorkspacePlan(
      Array.from({ length: 5 }, () => ({ actorId: 'owner', action: 'read' as const })),
      {
        ownerId: 'owner',
        members: [],
        maximumActions: 2,
      },
    )

    expect(plan.decisions).toHaveLength(2)
  })
})
