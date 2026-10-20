import { describe, expect, it } from 'vitest';
import { isNetworkCertificationTool, networkCertificationTask, NETWORK_QA_PUBLIC_URL } from './network-certification-task';

const agent = { id: 'qa', status: 'active', allowed_tools: ['web_search','web_fetch','http_request'] };
const permission = [
  { agent_id: 'qa', tool: 'web_fetch', enabled: true, allowed_domains: ['httpbingo.org'] },
  { agent_id: 'qa', tool: 'http_request', enabled: true, allowed_domains: ['httpbingo.org'] },
];
const tool = (slug: string) => ({ slug, enabled: true, executable: true });

describe('governed network QA task preparation', () => {
  it.each(['web_search','web_fetch','http_request'])('prepares a read-only %s task requiring real approval and evidence', slug => {
    const result = networkCertificationTask(tool(slug), agent, permission);
    expect(result.eligible).toBe(true);
    expect(result.input).toContain(`Use exactly the existing ${slug} tool once`);
    expect(result.input).toContain('queue the executable approval');
    expect(result.input).toContain('Do not invent success');
    expect(result.input).toContain('Do not switch tools or attempt external writes');
    expect(result.input).not.toMatch(/secret|password|access_token|Bearer /);
    if (slug === 'web_fetch' || slug === 'http_request') expect(result.input).toContain(NETWORK_QA_PUBLIC_URL);
    if (slug === 'http_request') expect(result.input).toContain('\\"method\\":\\"GET\\"');
  });
  it('never converts a write, browser, or unrelated tool into a QA task', () => {
    for (const slug of ['email_send','connected_service_write','browser_task','shopping_search','calculator']) {
      expect(isNetworkCertificationTool(slug)).toBe(false);
      expect(networkCertificationTask(tool(slug), agent, permission).eligible).toBe(false);
    }
  });
  it('requires an active owned agent assignment and enabled actual tool', () => {
    expect(networkCertificationTask(tool('web_search'), null, permission).eligible).toBe(false);
    expect(networkCertificationTask(tool('web_search'), { ...agent, status: 'draft' }, permission).eligible).toBe(false);
    expect(networkCertificationTask(tool('web_search'), { ...agent, allowed_tools: [] }, permission).reason).toMatch(/Assign web_search/);
    expect(networkCertificationTask({ ...tool('web_fetch'), enabled: false }, agent, permission).eligible).toBe(false);
    expect(networkCertificationTask({ ...tool('web_fetch'), executable: false }, agent, permission).eligible).toBe(false);
  });
  it('does not loosen disabled-agent grants or network domain restrictions', () => {
    expect(networkCertificationTask(tool('web_fetch'), agent, []).eligible).toBe(false);
    expect(networkCertificationTask(tool('http_request'), agent, [{ agent_id: 'qa', tool: 'http_request', allowed_domains: ['example.org'] }]).eligible).toBe(false);
    expect(networkCertificationTask(tool('web_search'), agent, [{ agent_id: 'qa', tool: 'web_search', enabled: false }]).eligible).toBe(false);
    expect(networkCertificationTask(tool('web_fetch'), agent, [{ agent_id: 'another-agent', tool: 'web_fetch', allowed_domains: ['httpbingo.org'] }]).eligible).toBe(false);
  });
});
