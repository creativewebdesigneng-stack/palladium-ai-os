export type BlackstarWorkspaceActorKind = 'human' | 'agent'
export type BlackstarWorkspaceAction =
  | 'read'
  | 'comment'
  | 'propose'
  | 'edit'
  | 'execute'
  | 'approve'
  | 'share'

export interface BlackstarWorkspaceMember {
  id: string
  kind: BlackstarWorkspaceActorKind
  role: 'owner' | 'collaborator' | 'observer' | 'agent'
}

export interface BlackstarWorkspaceActionRequest {
  actorId: string
  action: BlackstarWorkspaceAction
  resourceId?: string
  purpose?: string
}

export interface BlackstarWorkspacePolicy {
  ownerId: string
  members: BlackstarWorkspaceMember[]
  allowAgentEdits?: boolean
  allowAgentExecution?: boolean
  allowExternalSharing?: boolean
  requireHumanApprovalForAgentMutations?: boolean
  maximumActions?: number
}

export interface BlackstarWorkspaceDecision {
  request: BlackstarWorkspaceActionRequest
  allowed: boolean
  requiresApproval: boolean
  reason: string
  policyChecks: string[]
}

export interface BlackstarWorkspacePlan {
  decisions: BlackstarWorkspaceDecision[]
  executable: boolean
  requiresApproval: boolean
  blockedCount: number
}

const READ_ONLY_ACTIONS = new Set<BlackstarWorkspaceAction>(['read', 'comment', 'propose'])
const MUTATING_ACTIONS = new Set<BlackstarWorkspaceAction>(['edit', 'execute', 'share'])

function normalizeMembers(ownerId: string, members: BlackstarWorkspaceMember[]) {
  const byId = new Map<string, BlackstarWorkspaceMember>()
  for (const member of members) {
    if (!member.id.trim()) continue
    byId.set(member.id, member)
  }
  if (!byId.has(ownerId)) {
    byId.set(ownerId, { id: ownerId, kind: 'human', role: 'owner' })
  }
  return byId
}

function decision(
  request: BlackstarWorkspaceActionRequest,
  allowed: boolean,
  requiresApproval: boolean,
  reason: string,
): BlackstarWorkspaceDecision {
  return {
    request,
    allowed,
    requiresApproval,
    reason,
    policyChecks: [
      'membership-boundary',
      'role-boundary',
      'human-agent-boundary',
      'mutation-boundary',
      'approval-gate',
    ],
  }
}

export function buildBlackstarSharedWorkspacePlan(
  requests: BlackstarWorkspaceActionRequest[],
  policy: BlackstarWorkspacePolicy,
): BlackstarWorkspacePlan {
  const members = normalizeMembers(policy.ownerId, policy.members)
  const maximumActions = Math.max(1, Math.min(100, Math.floor(policy.maximumActions ?? 40)))
  const requireAgentApproval = policy.requireHumanApprovalForAgentMutations ?? true

  const decisions = requests.slice(0, maximumActions).map((request) => {
    const member = members.get(request.actorId)
    if (!member) {
      return decision(request, false, false, 'Actor is not a member of this workspace.')
    }

    if (request.action === 'approve') {
      const canApprove = member.kind === 'human' && (member.role === 'owner' || member.role === 'collaborator')
      return canApprove
        ? decision(request, true, false, 'Human workspace member may resolve an approval.')
        : decision(request, false, false, 'Approval decisions are restricted to authorised human members.')
    }

    if (request.action === 'share' && policy.allowExternalSharing !== true) {
      return decision(request, false, false, 'External sharing is disabled by workspace policy.')
    }

    if (member.role === 'observer' && !READ_ONLY_ACTIONS.has(request.action)) {
      return decision(request, false, false, 'Observers cannot mutate or execute workspace state.')
    }

    if (member.kind === 'agent') {
      if (request.action === 'edit' && policy.allowAgentEdits !== true) {
        return decision(request, false, false, 'Agent edits are disabled by workspace policy.')
      }
      if (request.action === 'execute' && policy.allowAgentExecution !== true) {
        return decision(request, false, false, 'Agent execution is disabled by workspace policy.')
      }

      const mutation = MUTATING_ACTIONS.has(request.action)
      if (mutation && requireAgentApproval) {
        return decision(
          request,
          true,
          true,
          'Agent action is allowed but crosses the human approval boundary.',
        )
      }
    }

    return decision(request, true, false, 'Action is allowed within the shared workspace policy.')
  })

  const blockedCount = decisions.filter((item) => !item.allowed).length
  return {
    decisions,
    executable: decisions.length > 0 && blockedCount === 0,
    requiresApproval: decisions.some((item) => item.requiresApproval),
    blockedCount,
  }
}
