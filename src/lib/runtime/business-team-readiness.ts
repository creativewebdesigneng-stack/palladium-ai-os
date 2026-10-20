import { BUSINESS_CAPABILITY_BENCHMARKS, type BusinessCapabilityId } from '@/lib/agents/agent-business-certification';
import { SIX_AGENT_BUSINESS_BLUEPRINT } from './business-operations-blueprint';

export type BusinessReadinessAgent = {
  id: string;
  name: string;
  status: string;
  allowed_tools?: string[] | null;
  modelProvider?: string | null;
  modelProviderConfiguration?: 'deployment_configured' | 'user_connected' | 'missing_configuration';
};

const ROLE_CAPABILITY: Record<(typeof SIX_AGENT_BUSINESS_BLUEPRINT.roles)[number]['id'], BusinessCapabilityId> = {
  research: 'web_research',
  validation: 'data_analysis',
  production: 'task_job_execution',
  marketing: 'marketing_growth',
  operations: 'customer_support',
  audit: 'financial_analysis',
};

type MatchedCandidate = {
  id: string;
  modelProviderConfiguration: 'deployment_configured' | 'user_connected' | 'missing_configuration';
};

/** Maximum bipartite match. Each role may use one unique agent, never clones. */
function matchDistinctRoles(
  roles: readonly { candidates: readonly MatchedCandidate[] }[],
  configuredProviderOnly: boolean,
): Map<string, number> {
  const allocated = new Map<string, number>();
  const allocate = (roleIndex: number, visited: Set<string>): boolean => {
    for (const candidate of roles[roleIndex]!.candidates) {
      if (configuredProviderOnly && candidate.modelProviderConfiguration === 'missing_configuration') continue;
      if (visited.has(candidate.id)) continue;
      visited.add(candidate.id);
      const previous = allocated.get(candidate.id);
      if (previous === undefined || allocate(previous, visited)) {
        allocated.set(candidate.id, roleIndex);
        return true;
      }
    }
    return false;
  };
  roles.forEach((_role, index) => allocate(index, new Set<string>()));
  return allocated;
}

/**
 * Reports CONFIGURED grants and distinct-agent coverage, not successful provider
 * connections, working model credentials, financially settled returns or task certification.
 * Matching a tool does not grant permission or silently invoke that tool.
 */
export function assessSixAgentBusinessReadiness(
  input: { agents: BusinessReadinessAgent[]; runtimeEnabled: boolean; truncated?: boolean },
) {
  const active = input.agents.filter((agent) => agent.status === 'active' && agent.id && agent.name);
  const drafts = input.agents.filter((agent) => agent.status === 'draft' && agent.id && agent.name);
  const roles = SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role) => {
    const capabilityId = ROLE_CAPABILITY[role.id];
    const benchmark = BUSINESS_CAPABILITY_BENCHMARKS.find((item) => item.id === capabilityId);
    const acceptedTools = benchmark?.configuredTools ?? [];
    const hasMatchingGrants = (agent: BusinessReadinessAgent) =>
      Array.isArray(agent.allowed_tools) &&
      agent.allowed_tools.some((tool) => typeof tool === 'string' && acceptedTools.includes(tool));
    const candidates = active.filter(hasMatchingGrants);
    const draftCandidates = drafts.filter(hasMatchingGrants);
    const candidateView = (agent: BusinessReadinessAgent) => ({
      id: agent.id,
      name: agent.name,
      modelProvider: agent.modelProvider ?? 'unspecified',
      modelProviderConfiguration: agent.modelProviderConfiguration ?? 'missing_configuration' as const,
    });
    return {
      id: role.id,
      title: role.name,
      capabilityId,
      acceptedTools: [...acceptedTools],
      candidates: candidates.map(candidateView),
      draftCandidates: draftCandidates.map(candidateView),
      status: candidates.length ? 'configured_unverified' as const : 'missing_tool_grants' as const,
    };
  });

  // Active coverage is executable preflight configuration, not certification.
  // Potential coverage includes DRAFTS only to guide operator preparation;
  // draft agents never join an execution plan until explicitly activated.
  const assignedAgentToRole = matchDistinctRoles(roles, false);
  const assignedProviderAgentToRole = matchDistinctRoles(roles, true);
  const potentialRoles = roles.map((role) => ({
    candidates: [...role.candidates, ...role.draftCandidates],
  }));
  const potentialAgentToRole = matchDistinctRoles(potentialRoles, false);
  const potentialProviderAgentToRole = matchDistinctRoles(potentialRoles, true);

  const agentForRole = new Map<number, string>();
  for (const [agentId, roleIndex] of assignedAgentToRole) {
    agentForRole.set(roleIndex, agentId);
  }

  const providerAgentForRole = new Map<number, string>();
  for (const [agentId, roleIndex] of assignedProviderAgentToRole) {
    providerAgentForRole.set(roleIndex, agentId);
  }

  return {
    assignedDistinctAgents: roles.map((role, roleIndex) => ({
      roleId: role.id,
      agentId: agentForRole.get(roleIndex) ?? null,
    })),
    assignedProviderConfiguredAgents: roles.map((role, roleIndex) => ({
      roleId: role.id,
      agentId: providerAgentForRole.get(roleIndex) ?? null,
    })),
    runtimeEnabled: input.runtimeEnabled,
    activeAgentCount: new Set(active.map((agent) => agent.id)).size,
    draftAgentCount: new Set(drafts.map((agent) => agent.id)).size,
    draftAgentsWithToolGrants: new Set(drafts.filter((agent) => Array.isArray(agent.allowed_tools) && agent.allowed_tools.length > 0).map((agent) => agent.id)).size,
    potentialDistinctRoleCoverage: potentialAgentToRole.size,
    potentialProviderConfiguredCoverage: potentialProviderAgentToRole.size,
    providerConfiguredAgentCount: new Set(active.filter((agent) => agent.modelProviderConfiguration !== undefined && agent.modelProviderConfiguration !== 'missing_configuration').map((agent) => agent.id)).size,
    providerConfiguredDistinctCoverage: assignedProviderAgentToRole.size,
    roles,
    configuredRoles: roles.filter((role) => role.status === 'configured_unverified').length,
    distinctAgentRoleCoverage: assignedAgentToRole.size,
    requiredRoles: SIX_AGENT_BUSINESS_BLUEPRINT.roles.length,
    truncated: input.truncated === true,
    grantsOnly: true as const,
    liveExecutionCertified: false as const,
    connectedProviderVerified: false as const,
    incomeVerified: false as const,
  };
}
