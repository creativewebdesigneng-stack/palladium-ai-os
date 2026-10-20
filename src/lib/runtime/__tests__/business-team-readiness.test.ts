import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assessSixAgentBusinessReadiness, type BusinessReadinessAgent } from '../business-team-readiness';

const source = readFileSync(new URL('../business-team-readiness.functions.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../../../components/workforce/BusinessTeamReadinessPanel.jsx', import.meta.url), 'utf8');

const configured = (id: string, tools: string[]): BusinessReadinessAgent => ({
  id, name: id, status: 'active', allowed_tools: tools,
});

describe('six-agent business team grant readiness', () => {
  it('reports no agents or coverage without inventing runtime success', () => {
    const result = assessSixAgentBusinessReadiness({ agents: [], runtimeEnabled: false });
    expect(result.activeAgentCount).toBe(0);
    expect(result.configuredRoles).toBe(0);
    expect(result.distinctAgentRoleCoverage).toBe(0);
    expect(result.runtimeEnabled).toBe(false);
    expect(result.liveExecutionCertified).toBe(false);
    expect(result.connectedProviderVerified).toBe(false);
    expect(result.incomeVerified).toBe(false);
  });

  it('never presents one web-enabled agent as six distinct specialists', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [configured('single', ['web_search', 'web_fetch', 'data_analysis', 'file_analysis', 'email_draft', 'calculator'])],
      runtimeEnabled: true,
    });
    expect(result.configuredRoles).toBe(6);
    expect(result.distinctAgentRoleCoverage).toBe(1);
    expect(result.roles.every((role) => role.status === 'configured_unverified')).toBe(true);
  });

  it('uses maximum matching to count separately staffed roles, not duplicate candidates', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [
        configured('web-specialist', ['web_search']),
        configured('analyst', ['data_analysis']),
        configured('producer', ['file_analysis']),
        configured('support', ['email_draft']),
        configured('growth', ['web_fetch']),
        configured('finance', ['calculator']),
      ],
      runtimeEnabled: true,
    });
    expect(result.configuredRoles).toBe(6);
    expect(result.distinctAgentRoleCoverage).toBe(6);
    expect(result.liveExecutionCertified).toBe(false);
    expect(result.incomeVerified).toBe(false);
  });

  it('ignores inactive and ungranted agents and reports limits honestly', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('inactive', ['web_fetch']), status: 'paused' },
        configured('empty', []),
        configured('support', ['email_draft']),
      ],
      runtimeEnabled: true,
      truncated: true,
    });
    expect(result.activeAgentCount).toBe(2);
    expect(result.distinctAgentRoleCoverage).toBe(1);
    expect(result.roles.find((role) => role.id === 'research')?.status).toBe('missing_tool_grants');
    expect(result.truncated).toBe(true);
  });

  it('reports configured model access separately from tool-grant matches', () => {
    const r = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('web-specialist', ['web_search']), modelProvider: 'groq', modelProviderConfiguration: 'missing_configuration' },
        { ...configured('analyst', ['data_analysis']), modelProvider: 'gemini', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('producer', ['file_analysis']), modelProvider: 'openai', modelProviderConfiguration: 'user_connected' },
        { ...configured('support', ['email_draft']), modelProvider: 'anthropic', modelProviderConfiguration: 'user_connected' },
        { ...configured('growth', ['web_fetch']), modelProvider: 'gemini', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('finance', ['calculator']), modelProvider: 'lovable', modelProviderConfiguration: 'missing_configuration' },
      ],
      runtimeEnabled: true,
    });
    expect(r.distinctAgentRoleCoverage).toBe(6);
    expect(r.providerConfiguredAgentCount).toBe(4);
    expect(r.providerConfiguredDistinctCoverage).toBe(4);
    expect(r.liveExecutionCertified).toBe(false);
    expect(r.incomeVerified).toBe(false);
    expect(r.roles.find((role) => role.id === 'research')?.candidates[0]?.modelProviderConfiguration).toBe('missing_configuration');
  });

  it('maximises model-ready staffing separately even when first grant match is not configured', () => {
    const r = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('unconfigured', ['web_search','data_analysis']), modelProviderConfiguration: 'missing_configuration' },
        { ...configured('research', ['web_search']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('validator', ['data_analysis']), modelProviderConfiguration: 'user_connected' },
      ],
      runtimeEnabled: true,
    });
    expect(r.providerConfiguredDistinctCoverage).toBe(2);
  });

  it('reports full role coverage separately from model-access coverage', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('a', ['web_search']), modelProviderConfiguration: 'missing_configuration' },
        { ...configured('b', ['data_analysis']), modelProviderConfiguration: 'missing_configuration' },
        { ...configured('c', ['file_analysis']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('d', ['web_fetch']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('e', ['email_draft']), modelProviderConfiguration: 'user_connected' },
        { ...configured('f', ['calculator']), modelProviderConfiguration: 'user_connected' },
      ],
      runtimeEnabled: true,
    });
    expect(result.distinctAgentRoleCoverage).toBe(6);
    expect(result.providerConfiguredDistinctCoverage).toBe(4);
    expect(result.assignedProviderConfiguredAgents).toHaveLength(6);
    expect(result.assignedProviderConfiguredAgents.filter((match) => match.agentId !== null)).toHaveLength(4);
    expect(result.connectedProviderVerified).toBe(false);
  });

  it('separates active staffing from potential draft coverage without executing drafts', () => {
    const ready = (id: string, tools: string[], status: string) => ({
      ...configured(id, tools), status,
      modelProviderConfiguration: 'deployment_configured' as const,
    });
    const result = assessSixAgentBusinessReadiness({
      agents: [
        ready('active-research', ['web_search'], 'active'),
        ready('active-analyst', ['data_analysis'], 'active'),
        ready('draft-producer', ['file_analysis'], 'draft'),
        ready('draft-marketing', ['web_fetch'], 'draft'),
        ready('draft-support', ['email_draft'], 'draft'),
        ready('draft-audit', ['calculator'], 'draft'),
        ready('no-grants', [], 'draft'),
      ],
      runtimeEnabled: true,
    });
    expect(result.activeAgentCount).toBe(2);
    expect(result.draftAgentCount).toBe(5);
    expect(result.draftAgentsWithToolGrants).toBe(4);
    expect(result.distinctAgentRoleCoverage).toBe(2);
    expect(result.providerConfiguredDistinctCoverage).toBe(2);
    expect(result.potentialDistinctRoleCoverage).toBe(6);
    expect(result.potentialProviderConfiguredCoverage).toBe(6);
    expect(result.assignedProviderConfiguredAgents.filter((row) => row.agentId !== null)).toHaveLength(2);
    expect(result.roles.find((role) => role.id === 'operations')?.candidates).toHaveLength(0);
    expect(result.roles.find((role) => role.id === 'operations')?.draftCandidates.map((a) => a.id))
      .toEqual(['draft-support']);
    expect(result.liveExecutionCertified).toBe(false);
    expect(result.incomeVerified).toBe(false);
  });

  it('identifies a missing role that activating every existing draft cannot solve', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('a', ['web_search']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('b', ['data_analysis']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('c', ['file_analysis']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('d', ['web_fetch']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('e', ['calculator']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
      ],
      runtimeEnabled: true,
    });
    expect(result.potentialDistinctRoleCoverage).toBe(5);
    expect(result.potentialProviderConfiguredCoverage).toBe(5);
    expect(result.roles.find((role) => role.id === 'operations')?.candidates).toHaveLength(0);
    expect(result.roles.find((role) => role.id === 'operations')?.draftCandidates).toHaveLength(0);
  });

  it('never treats draft providers as operational when no model route is configured', () => {
    const result = assessSixAgentBusinessReadiness({
      agents: [
        { ...configured('draft-a', ['email_draft']), status: 'draft', modelProviderConfiguration: 'missing_configuration' },
      ],
      runtimeEnabled: true,
    });
    expect(result.distinctAgentRoleCoverage).toBe(0);
    expect(result.providerConfiguredDistinctCoverage).toBe(0);
    expect(result.potentialDistinctRoleCoverage).toBe(1);
    expect(result.potentialProviderConfiguredCoverage).toBe(0);
  });

  it('suggests six distinct existing agents with the fewest missing capability grants', () => {
    const r = assessSixAgentBusinessReadiness({
      runtimeEnabled: true,
      agents: [
        { ...configured('research', ['web_search']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('validation', ['data_analysis']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('production', ['file_analysis']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('marketing', ['web_fetch']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('finance', ['calculator']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
        { ...configured('support', []), status: 'draft', modelProviderConfiguration: 'missing_configuration' },
      ],
    });
    const plan = r.operatorReviewStaffing;
    expect(plan).toHaveLength(6);
    expect(new Set(plan.map((item) => item.agentId)).size).toBe(6);
    expect(plan.filter((item) => item.readyByConfigurationOnly)).toHaveLength(2);
    expect(plan.filter((item) => item.needsActivation)).toHaveLength(4);
    expect(plan.filter((item) => item.reviewGrant)).toHaveLength(1);
    const support = plan.find((item) => item.roleId === 'operations');
    expect(support).toMatchObject({
      agentId: 'support', agentStatus: 'draft', reviewGrant: 'email_draft',
      needsProviderSetup: true, readyByConfigurationOnly: false,
    });
    expect(r.providerConfiguredDistinctCoverage).toBe(2);
    expect(r.incomeVerified).toBe(false);
  });

  it('does not reuse one agent across role recommendations or imply absent staff exist', () => {
    const r = assessSixAgentBusinessReadiness({
      runtimeEnabled: true,
      agents: [
        { ...configured('generalist', ['web_search','data_analysis','file_analysis','web_fetch','email_draft','calculator']), modelProviderConfiguration: 'deployment_configured' },
        { ...configured('draft-generalist', ['web_search','data_analysis','file_analysis','web_fetch','email_draft','calculator']), status: 'draft', modelProviderConfiguration: 'deployment_configured' },
      ],
    });
    const assigned = r.operatorReviewStaffing.filter((item) => item.agentId);
    expect(assigned).toHaveLength(2);
    expect(new Set(assigned.map((item) => item.agentId)).size).toBe(2);
    expect(r.operatorReviewStaffing.filter((item) => !item.agentId)).toHaveLength(4);
    expect(r.distinctAgentRoleCoverage).toBe(1);
    expect(r.potentialDistinctRoleCoverage).toBe(2);
  });

  it('suggests no permissions or activations when six configured active specialists exist', () => {
    const roles = [
      ['research', ['web_search']],
      ['validation', ['data_analysis']],
      ['production', ['file_analysis']],
      ['marketing', ['web_fetch']],
      ['operations', ['email_draft']],
      ['audit', ['calculator']],
    ] as const;
    const r = assessSixAgentBusinessReadiness({
      runtimeEnabled: true,
      agents: roles.map(([id, tools]) => ({
        ...configured(id, [...tools]), modelProviderConfiguration: 'user_connected' as const,
      })),
    });
    expect(r.operatorReviewStaffing.every((item) => item.alreadyHasMatchingGrant)).toBe(true);
    expect(r.operatorReviewStaffing.every((item) => item.readyByConfigurationOnly)).toBe(true);
    expect(r.operatorReviewStaffing.every((item) => item.reviewGrant === null && !item.needsActivation && !item.needsProviderSetup)).toBe(true);
    expect(r.liveExecutionCertified).toBe(false);
  });

  it('uses owner-scoped read-only queries and never returns credentials', () => {
    expect(source).toContain('.middleware([requireSupabaseAuth])');
    expect(source).toContain(".eq('user_id', context.userId)");
    expect(source).toContain(".in('status', ['active', 'draft'])");
    expect(source).toContain(".order('status', { ascending: true })");
    expect(source).not.toContain(".eq('status', 'active')");
    expect(source).toContain(".select('id,name,status,allowed_tools,model_provider')");
    expect(source).toContain('isProviderAvailableForUser({ userId: context.userId, provider })');
    expect(source).toContain('.catch(() => false)');
    expect(source).toContain('deploymentProviderConfigured(provider)');
    expect(source).toContain(".select('enabled')");
    for (const write of ['.insert(', '.update(', '.upsert(', '.delete(', 'service_role', 'api_key']) {
      expect(source).not.toContain(write);
    }
    expect(panel).toContain('getSixAgentBusinessReadiness');
    expect(panel).toContain('Maximum roles staffed by distinct agents');
    expect(panel).toContain('/agents/new');
    expect(panel).toContain('Review existing draft agents');
    expect(panel).toContain('data.potentialDistinctRoleCoverage');
    expect(panel).toContain('data.potentialProviderConfiguredCoverage');
    expect(panel).toContain('role.draftCandidates');
    expect(panel).toContain('Each role must have a different active agent');
    expect(panel).toContain('data.assignedProviderConfiguredAgents?.some');
    expect(panel).toContain('data.operatorReviewStaffing.map');
    expect(panel).toContain('For operator review only');
    expect(panel).toContain('not live-certified');
    expect(screen).toContain('<BusinessTeamReadinessPanel session={session} />');
  });
});
