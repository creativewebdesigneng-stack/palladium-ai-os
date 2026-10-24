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
 * Operator review plan ONLY, never an execution plan or a grant request.
 *
 * Search each existing agent once over 2^6 role masks. This finds a distinct
 * six-person assignment while favouring existing tool grants, configured
 * model routes and active agents over new permissions or activations.
 * Runtime eligibility still uses its strict active/approved matching above.
 */
const REVIEW_ONLY_LOW_SCOPE_TOOL: Record<(typeof SIX_AGENT_BUSINESS_BLUEPRINT.roles)[number]['id'], string> = {
  research: 'web_search',
  validation: 'data_analysis',
  production: 'file_analysis',
  marketing: 'web_fetch',
  operations: 'email_draft',
  audit: 'calculator',
};

export type BusinessStaffingRecommendation = {
  roleId: string;
  roleTitle: string;
  agentId: string | null;
  agentName: string | null;
  agentStatus: 'active' | 'draft' | null;
  modelProvider: string | null;
  needsActivation: boolean;
  needsProviderSetup: boolean;
  reviewGrant: string | null;
  alreadyHasMatchingGrant: boolean;
  readyByConfigurationOnly: boolean;
};

function suggestOperatorReviewStaffing(
  agents: readonly BusinessReadinessAgent[],
  roles: readonly { id: keyof typeof REVIEW_ONLY_LOW_SCOPE_TOOL; title: string; acceptedTools: readonly string[] }[],
): BusinessStaffingRecommendation[] {
  type CandidateChoice = {
    agent: BusinessReadinessAgent;
    hasGrant: boolean;
    reviewGrant: string | null;
    providerMissing: boolean;
  };
  type State = { cost: number; choices: Array<CandidateChoice | null> };
  const fullMask = (1 << roles.length) - 1;
  let states = new Map<number, State>([[0, { cost: 0, choices: Array(roles.length).fill(null) }]]);
  const eligible = agents.filter((agent) =>
    (agent.status === 'active' || agent.status === 'draft') && Boolean(agent.id && agent.name)
  );
  for (const agent of eligible) {
    const next = new Map(states);
    for (const [mask, current] of states) {
      if (mask === fullMask) continue;
      for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
        if (mask & (1 << roleIndex)) continue;
        const role = roles[roleIndex]!;
        const granted = (agent.allowed_tools ?? []).find((tool) => role.acceptedTools.includes(tool));
        const hasGrant = Boolean(granted);
        const providerMissing = !agent.modelProviderConfiguration ||
          agent.modelProviderConfiguration === 'missing_configuration';
        const reviewGrant = !hasGrant
          ? (role.acceptedTools.includes(REVIEW_ONLY_LOW_SCOPE_TOOL[role.id])
            ? REVIEW_ONLY_LOW_SCOPE_TOOL[role.id] : role.acceptedTools[0] ?? null)
          : null;
        // Prefer already-approved capabilities before provider/activation fixes.
        // No step grants access, changes agent status, or tests inference.
        const cost = current.cost +
          (hasGrant ? 0 : 20) +
          (providerMissing ? 8 : 0) +
          (agent.status === 'draft' ? 3 : 0);
        const nextMask = mask | (1 << roleIndex);
        const previous = next.get(nextMask);
        if (!previous || cost < previous.cost) {
          const choices = [...current.choices];
          choices[roleIndex] = { agent, hasGrant, reviewGrant, providerMissing };
          next.set(nextMask, { cost, choices });
        }
      }
    }
    states = next;
  }
  // With fewer than six agents, show the best partial review plan without
  // inventing a replacement agent or counting a specialist twice.
  let bestMask = 0;
  let best = states.get(0)!;
  const numberOfRoles = (mask: number) => mask.toString(2).replace(/0/g, '').length;
  for (const [mask, option] of states) {
    if (numberOfRoles(mask) > numberOfRoles(bestMask) ||
        (numberOfRoles(mask) === numberOfRoles(bestMask) && option.cost < best.cost)) {
      bestMask = mask;
      best = option;
    }
  }
  return roles.map((role, index) => {
    const choice = best.choices[index];
    if (!choice) {
      return {
        roleId: role.id, roleTitle: role.title, agentId: null, agentName: null,
        agentStatus: null, modelProvider: null, needsActivation: false,
        needsProviderSetup: false, reviewGrant: null,
        alreadyHasMatchingGrant: false, readyByConfigurationOnly: false,
      };
    }
    return {
      roleId: role.id,
      roleTitle: role.title,
      agentId: choice.agent.id,
      agentName: choice.agent.name,
      agentStatus: choice.agent.status as 'active' | 'draft',
      modelProvider: choice.agent.modelProvider ?? 'unspecified',
      needsActivation: choice.agent.status !== 'active',
      needsProviderSetup: choice.providerMissing,
      reviewGrant: choice.reviewGrant,
      alreadyHasMatchingGrant: choice.hasGrant,
      readyByConfigurationOnly:
        choice.agent.status === 'active' && choice.hasGrant && !choice.providerMissing,
    };
  });
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
    operatorReviewStaffing: suggestOperatorReviewStaffing([...active, ...drafts], roles),
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
