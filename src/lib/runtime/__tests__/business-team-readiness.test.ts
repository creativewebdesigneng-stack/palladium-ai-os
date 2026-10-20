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

  it('uses owner-scoped read-only queries and never returns credentials', () => {
    expect(source).toContain('.middleware([requireSupabaseAuth])');
    expect(source).toContain(".eq('user_id', context.userId)");
    expect(source).toContain(".select('id,name,status,allowed_tools,model_provider')");
    expect(source).toContain('listUserModelProviderCredentials(context.userId)');
    expect(source).toContain('deploymentProviderConfigured(provider)');
    expect(source).toContain(".select('enabled')");
    for (const write of ['.insert(', '.update(', '.upsert(', '.delete(', 'service_role', 'api_key']) {
      expect(source).not.toContain(write);
    }
    expect(panel).toContain('getSixAgentBusinessReadiness');
    expect(panel).toContain('Maximum roles staffed by distinct agents');
    expect(screen).toContain('<BusinessTeamReadinessPanel session={session} />');
  });
});
