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

/**
 * Reports CONFIGURED grants and distinct-agent coverage, not successful provider
 * connections, working model credentials, financially settled returns or task certification.
 * Matching a tool does not grant permission or silently invoke that tool.
 */
export function assessSixAgentBusinessReadiness(
  input: { agents: BusinessReadinessAgent[]; runtimeEnabled: boolean; truncated?: boolean },
) {
  const active = input.agents.filter((agent) => agent.status === 'active' && agent.id && agent.name);
  const roles = SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role) => {
    const capabilityId = ROLE_CAPABILITY[role.id];
    const benchmark = BUSINESS_CAPABILITY_BENCHMARKS.find((item) => item.id === capabilityId);
    const acceptedTools = benchmark?.configuredTools ?? [];
    const candidates = active.filter((agent) =>
      Array.isArray(agent.allowed_tools) &&
      agent.allowed_tools.some((tool) => typeof tool === 'string' && acceptedTools.includes(tool))
    );
    return {
      id: role.id,
      title: role.name,
      capabilityId,
      acceptedTools: [...acceptedTools],
      candidates: candidates.map((agent) => ({
        id: agent.id,
        name: agent.name,
        modelProvider: agent.modelProvider ?? 'unspecified',
        modelProviderConfiguration: agent.modelProviderConfiguration ?? 'missing_configuration',
      })),
      status: candidates.length ? 'configured_unverified' as const : 'missing_tool_grants' as const,
    };
  });

  // Maximum matching, not a sum of role-candidate counts. One configured agent
  // cannot be advertised as six DISTINCT specialists.
  const assignedAgentToRole = new Map<string, number>();
  const allocate = (roleIndex: number, visited: Set<string>): boolean => {
    for (const candidate of roles[roleIndex]!.candidates) {
      if (visited.has(candidate.id)) continue;
      visited.add(candidate.id);
      const previouslyAssigned = assignedAgentToRole.get(candidate.id);
      if (previouslyAssigned === undefined || allocate(previouslyAssigned, visited)) {
        assignedAgentToRole.set(candidate.id, roleIndex);
        return true;
      }
    }
    return false;
  };
  roles.forEach((_role, index) => allocate(index, new Set<string>()));

  // Configuration of a preferred model provider is only a first readiness
  // signal, not proof of a live inference call. A role may have several
  // qualified agents, so match independently rather than reusing grant-only
  // assignments and inadvertently understating viable team coverage.
  const assignedProviderAgentToRole = new Map<string, number>();
  const allocateProvider = (roleIndex: number, visited: Set<string>): boolean => {
    for (const candidate of roles[roleIndex]!.candidates) {
      if (candidate.modelProviderConfiguration === 'missing_configuration' || visited.has(candidate.id)) continue;
      visited.add(candidate.id);
      const earlier = assignedProviderAgentToRole.get(candidate.id);
      if (earlier === undefined || allocateProvider(earlier, visited)) {
        assignedProviderAgentToRole.set(candidate.id, roleIndex);
        return true;
      }
    }
    return false;
  };
  roles.forEach((_role, index) => allocateProvider(index, new Set<string>()));

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
