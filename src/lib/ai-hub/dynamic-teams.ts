export interface TeamAgentCandidate {
  agentId: string
  capabilities: string[]
  trustScore: number
  available: boolean
  activeWorkloads?: number
}

type AgentHistoryRow = { agent_id: string; status?: string | null }
type AgentCapabilityRow = {
  id: string
  allowed_tools?: string[] | null
  operating_profile?: { skills?: string[] | null } | null
}

export function buildDynamicTeamCandidates(
  agents: AgentCapabilityRow[],
  tasks: AgentHistoryRow[],
): TeamAgentCandidate[] {
  const byAgent = new Map<string, AgentHistoryRow[]>()
  for (const task of tasks) {
    const rows = byAgent.get(task.agent_id) ?? []
    rows.push(task)
    byAgent.set(task.agent_id, rows)
  }

  return agents.map((agent) => {
    const history = byAgent.get(agent.id) ?? []
    const completed = history.filter((task) => ['completed', 'succeeded'].includes(String(task.status))).length
    const failed = history.filter((task) => ['failed', 'cancelled'].includes(String(task.status))).length
    const finished = completed + failed
    const trustScore = finished > 0 ? completed / finished : 0.75
    const activeWorkloads = history.filter((task) => ['queued', 'running', 'waiting_for_approval'].includes(String(task.status))).length
    const capabilities = [...new Set([
      ...(agent.allowed_tools ?? []),
      ...(agent.operating_profile?.skills ?? []),
    ].map((value) => String(value).trim()).filter(Boolean))]

    return {
      agentId: agent.id,
      capabilities,
      trustScore,
      available: true,
      activeWorkloads,
    }
  })
}

export interface DynamicTeamRequest {
  missionId: string
  requiredCapabilities: string[]
  maxTeamSize?: number
  minTrustScore?: number
  maxActiveWorkloads?: number
}

export interface DynamicTeamPlan {
  missionId: string
  agentIds: string[]
  capabilityAssignments: Record<string, string>
  coveredCapabilities: string[]
  missingCapabilities: string[]
  ready: boolean
}

export function formDynamicAgentTeam(
  candidates: TeamAgentCandidate[],
  request: DynamicTeamRequest,
): DynamicTeamPlan {
  const required = [...new Set(request.requiredCapabilities.filter(Boolean))]
  const maxTeamSize = Math.max(1, Math.min(20, request.maxTeamSize ?? 6))
  const minTrust = Math.max(0, Math.min(1, request.minTrustScore ?? 0.7))
  const maxActiveWorkloads = Math.max(0, request.maxActiveWorkloads ?? 5)
  const eligible = candidates
    .filter((candidate) => candidate.available)
    .filter((candidate) => candidate.trustScore >= minTrust)
    .filter((candidate) => (candidate.activeWorkloads ?? 0) <= maxActiveWorkloads)
    .map((candidate) => ({ ...candidate, capabilities: [...new Set(candidate.capabilities)] }))

  const uncovered = new Set(required)
  const selected: TeamAgentCandidate[] = []
  const assignments: Record<string, string> = {}

  while (uncovered.size > 0 && selected.length < maxTeamSize) {
    const ranked = eligible
      .filter((candidate) => !selected.some((member) => member.agentId === candidate.agentId))
      .map((candidate) => ({
        candidate,
        coverage: candidate.capabilities.filter((capability) => uncovered.has(capability)),
      }))
      .filter((entry) => entry.coverage.length > 0)
      .sort((a, b) => {
        if (b.coverage.length !== a.coverage.length) return b.coverage.length - a.coverage.length
        if (b.candidate.trustScore !== a.candidate.trustScore) return b.candidate.trustScore - a.candidate.trustScore
        return a.candidate.agentId.localeCompare(b.candidate.agentId)
      })

    const best = ranked[0]
    if (!best) break
    selected.push(best.candidate)
    for (const capability of best.coverage) {
      assignments[capability] = best.candidate.agentId
      uncovered.delete(capability)
    }
  }

  const coveredCapabilities = required.filter((capability) => !uncovered.has(capability))
  const missingCapabilities = required.filter((capability) => uncovered.has(capability))
  return {
    missionId: request.missionId,
    agentIds: selected.map((candidate) => candidate.agentId),
    capabilityAssignments: assignments,
    coveredCapabilities,
    missingCapabilities,
    ready: required.length > 0 && missingCapabilities.length === 0,
  }
}
