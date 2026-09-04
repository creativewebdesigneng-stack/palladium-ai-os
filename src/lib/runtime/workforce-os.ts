export type WorkforceOSInput = {
  workforces: Array<{ id: string; status?: string | null }>;
  memberships: Array<{ workforce_id?: string | null; agent_id?: string | null }>;
  workflowRuns: Array<{ id: string; status?: string | null }>;
  fleetAssignments: Array<{ id?: string; agent_id?: string | null; status?: string | null }>;
  approvals: Array<{ id: string; status?: string | null; agent_id?: string | null }>;
  identities: Array<{ id: string; agent_id?: string | null; status?: string | null }>;
  passports: Array<{ id: string; identity_id?: string | null; autonomy_tier?: string | null; risk_tier?: string | null }>;
  delegations: Array<{ id: string; status?: string | null; expires_at?: string | null }>;
};

const LIVE_RUN_STATES = new Set(['pending', 'queued', 'running', 'waiting_for_tool', 'waiting_for_approval']);
const ACTIVE_ASSIGNMENT_STATES = new Set(['active', 'assigned', 'running', 'queued']);

export function buildWorkforceOperatingState(input: WorkforceOSInput, now = new Date()) {
  const assignedAgentIds = new Set(
    input.memberships.map((row) => row.agent_id).filter((id): id is string => Boolean(id)),
  );
  const activeIdentityByAgent = new Map(
    input.identities
      .filter((row) => row.agent_id && row.status === 'active')
      .map((row) => [row.agent_id as string, row.id]),
  );
  const passportIdentityIds = new Set(
    input.passports.map((row) => row.identity_id).filter((id): id is string => Boolean(id)),
  );
  const agentsWithIdentity = [...assignedAgentIds].filter((agentId) => activeIdentityByAgent.has(agentId));
  const agentsWithPassport = agentsWithIdentity.filter((agentId) => {
    const identityId = activeIdentityByAgent.get(agentId);
    return Boolean(identityId && passportIdentityIds.has(identityId));
  });
  const uncoveredAgents = [...assignedAgentIds].filter((agentId) => !agentsWithPassport.includes(agentId));

  const liveRuns = input.workflowRuns.filter((row) => LIVE_RUN_STATES.has(String(row.status ?? '')));
  const activeFleetAssignments = input.fleetAssignments.filter((row) => {
    const status = String(row.status ?? 'active');
    return ACTIVE_ASSIGNMENT_STATES.has(status);
  });
  const pendingApprovals = input.approvals.filter((row) => row.status === 'pending');
  const activeDelegations = input.delegations.filter((row) => {
    if (row.status !== 'active') return false;
    if (!row.expires_at) return true;
    const expiry = new Date(row.expires_at);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
  });
  const highAutonomyPassports = input.passports.filter((row) =>
    ['autonomous', 'high', 'unattended'].includes(String(row.autonomy_tier ?? '').toLowerCase()),
  );
  const highRiskPassports = input.passports.filter((row) =>
    ['high', 'critical'].includes(String(row.risk_tier ?? '').toLowerCase()),
  );
  const passportCoverage = assignedAgentIds.size
    ? Math.round((agentsWithPassport.length / assignedAgentIds.size) * 100)
    : 100;

  const risks: Array<{ code: string; severity: 'info' | 'warning' | 'critical'; count: number; message: string }> = [];
  if (uncoveredAgents.length) {
    risks.push({
      code: 'IDENTITY_COVERAGE_GAP',
      severity: 'critical',
      count: uncoveredAgents.length,
      message: `${uncoveredAgents.length} assigned agent${uncoveredAgents.length === 1 ? '' : 's'} lack an active Blackstar identity/passport boundary.`,
    });
  }
  if (pendingApprovals.length) {
    risks.push({
      code: 'APPROVAL_QUEUE',
      severity: 'warning',
      count: pendingApprovals.length,
      message: `${pendingApprovals.length} workforce action${pendingApprovals.length === 1 ? '' : 's'} are waiting for approval.`,
    });
  }
  if (highRiskPassports.length) {
    risks.push({
      code: 'HIGH_RISK_AUTONOMY',
      severity: 'warning',
      count: highRiskPassports.length,
      message: `${highRiskPassports.length} visible passport${highRiskPassports.length === 1 ? '' : 's'} carry a high or critical risk tier.`,
    });
  }

  return {
    stats: {
      workforces: input.workforces.length,
      activeWorkforces: input.workforces.filter((row) => row.status === 'active').length,
      assignedAgents: assignedAgentIds.size,
      passportCoverage,
      liveWorkflowRuns: liveRuns.length,
      activeFleetAssignments: activeFleetAssignments.length,
      pendingApprovals: pendingApprovals.length,
      activeDelegations: activeDelegations.length,
      highAutonomyPassports: highAutonomyPassports.length,
    },
    governance: {
      uncoveredAgentIds: uncoveredAgents,
      risks,
      healthy: risks.every((risk) => risk.severity !== 'critical'),
    },
  };
}
