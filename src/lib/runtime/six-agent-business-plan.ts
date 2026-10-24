import type { OrchestratorCandidate, OrchestratorPlan } from '@/lib/agents/agent-orchestrator';
import { SIX_AGENT_BUSINESS_BLUEPRINT } from './business-operations-blueprint';
import { assessSixAgentBusinessReadiness } from './business-team-readiness';

const BUSINESS_STAGE_DEPENDENCIES: Record<(typeof SIX_AGENT_BUSINESS_BLUEPRINT.roles)[number]['id'], string[]> = {
  research: [],
  validation: ['research'],
  production: ['validation'],
  marketing: ['validation'],
  operations: ['production'],
  audit: ['production', 'marketing', 'operations'],
};

/**
 * Deterministic route for the opt-in business blueprint ONLY. The existing
 * orchestrator/workflow executor still owns persistence, tool security,
 * approvals, agent runtime and audit records. This planner never runs tools.
 */
export function planSixAgentBusinessTeam(args: {
  goal: string;
  candidates: OrchestratorCandidate[];
  maxAssignments: number;
  /** Available via Blackstar's existing owner-scoped model credential resolver. */
  providerConfiguredAgentIds: readonly string[];
}): OrchestratorPlan {
  const totalRoles = SIX_AGENT_BUSINESS_BLUEPRINT.roles.length;
  if (args.maxAssignments < totalRoles) {
    throw new Error(`The business blueprint needs ${totalRoles} assignments. Increase the goal's specialist limit before running.`);
  }
  const configuredIds = new Set(args.providerConfiguredAgentIds);
  const readiness = assessSixAgentBusinessReadiness({
    agents: args.candidates.map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: 'active',
      allowed_tools: agent.allowed_tools ?? null,
      modelProviderConfiguration: configuredIds.has(agent.id) ? 'deployment_configured' : 'missing_configuration',
    })),
    runtimeEnabled: true,
  });
  if (readiness.distinctAgentRoleCoverage !== totalRoles) {
    const ungranted = readiness.roles
      .filter((role) => role.status === 'missing_tool_grants')
      .map((role) => role.title);
    throw new Error(
      `Six-Agent Business Operations is not staffed: only ${readiness.distinctAgentRoleCoverage}/${totalRoles} roles can be matched to different eligible agents with relevant tool grants.` +
      (ungranted.length ? ` Missing grants: ${ungranted.join(', ')}.` : ' Separate the overlapping roles across additional active agents.') +
      ' Configure and test the agents before starting a run.',
    );
  }

  if (readiness.providerConfiguredDistinctCoverage !== totalRoles) {
    throw new Error(
      `Six-Agent Business Operations cannot start: only ${readiness.providerConfiguredDistinctCoverage}/${totalRoles} distinct roles have both matching tool grants and an available model provider. ` +
      'Connect or configure each specialist model in the existing AI Hub and check its inference before retrying.',
    );
  }

  const assignments = SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role) => {
    const matched = readiness.assignedProviderConfiguredAgents.find((value) => value.roleId === role.id);
    if (!matched?.agentId) throw new Error(`No distinct authorised specialist for ${role.name}.`);
    return {
      id: role.id,
      title: role.name,
      agent_id: matched.agentId,
      objective: [
        role.task,
        `Required evidence: ${role.evidence}.`,
        'Research and prepare drafts only. Cite actually observed source and tool evidence; explicitly report disabled tools, unavailable providers and incomplete work.',
        'Do not conduct transactions, trading, unsolicited communication, pricing changes, public posting or purchases. External actions require the existing gateway and explicit approval.',
        'Do not claim revenue or profit without verified independent payment/settlement evidence.',
      ].join(' '),
      depends_on: [...BUSINESS_STAGE_DEPENDENCIES[role.id]],
      success_criteria: [
        role.evidence,
        'Distinguish observed evidence from suggestions, projections and simulation.',
        'No unapproved external side effects; report execution and provider blockers.',
      ],
      requires_approval: true,
    };
  });
  if (assignments.some((assignment) => !configuredIds.has(assignment.agent_id))) {
    throw new Error('A selected business specialist no longer has a configured model route.');
  }
  if (new Set(assignments.map((assignment) => assignment.agent_id)).size !== totalRoles) {
    throw new Error('Six business roles did not match six distinct agents.');
  }
  return {
    version: 1,
    goal: args.goal,
    summary: 'Six staffed, permission-bounded specialist assignments. Planning is not execution, provider certification or revenue.',
    assignments,
  };
}
