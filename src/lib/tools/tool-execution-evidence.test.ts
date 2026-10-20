import { describe, expect, it } from 'vitest';
import { toolExecutionEvidence } from './tool-execution-evidence';

const tools = ['browser_task', 'calculator', 'current_time', 'data_analysis', 'web_search',
  'integration_action', 'request_approval', 'memory_search']
  .map(slug => ({ slug, is_active: true, executable: true }));
const browserApproval = {
  agent_id: 'owned-agent', action_type: 'agent_browser_task',
  status: 'approved', execution_status: 'succeeded',
  details: { agent_task_id: 'browser-task' },
  execution_result: {
    provider: 'playwright', simulated: false, task_status: 'succeeded',
    agent_task_id: 'browser-task',
  },
};
const localApproval = (tool: string, task: string) => ({
  agent_id: 'owned-agent', action_type: 'agent_tool_task',
  status: 'approved', execution_status: 'succeeded',
  details: { agent_task_id: task, tool },
  execution_result: {
    provider: 'local', simulated: false, task_status: 'succeeded', agent_task_id: task,
    tool_evidence: { format: 'json', characters: 7, truncated: false, content: '{"a":1}' },
  },
});
const success = (tool: string, agent_task_id: string) =>
  ({ tool, status: 'succeeded', agent_id: 'owned-agent', agent_task_id });

describe('agent tool evidence classification', () => {
  it('certifies only matching approved real browser and local task receipts, never the generic approval workflow', () => {
    const runs = [success('browser_task', 'browser-task'),
      success('calculator', 'calc-task'), success('current_time', 'time-task'),
      success('data_analysis', 'analysis-task'),
      { tool: 'web_search', status: 'failed' },
      { tool: 'integration_action', status: 'succeeded' },
      { tool: 'request_approval', status: 'succeeded' }];
    const approvals = [browserApproval, localApproval('calculator', 'calc-task'),
      localApproval('current_time', 'time-task'), localApproval('data_analysis', 'analysis-task')];
    const states = new Map(toolExecutionEvidence(tools, runs, approvals).map(row => [row.slug, row.state]));
    expect(states.get('browser_task')).toBe('browser_verified');
    for (const tool of ['calculator', 'current_time', 'data_analysis'])
      expect(states.get(tool)).toBe('local_verified');
    expect(states.get('web_search')).toBe('failed_only');
    expect(states.get('integration_action')).toBe('approval_activity');
    expect(states.get('request_approval')).toBe('approval_activity');
    expect(states.get('memory_search')).toBe('not_tested');
  });

  it('does not promote a standalone successful tool record to verified', () => {
    expect(toolExecutionEvidence(tools, [success('calculator','calc-task')], [])[1]?.state)
      .toBe('execution_recorded');
  });

  it('rejects mismatched owner-agent, original task, approval status and wrong tool receipts', () => {
    const good = localApproval('calculator','calc-task');
    const altered = [
      { ...good, agent_id:'other-agent' },
      { ...good, details:{ ...good.details,agent_task_id:'other-task' } },
      { ...good, details:{ ...good.details,tool:'current_time' } },
      { ...good, status:'pending' },
      { ...good, execution_status:'executing' },
      { ...good, execution_result:{ ...good.execution_result,simulated:true } },
      { ...good, execution_result:{ ...good.execution_result,task_status:'waiting_for_approval' } },
      { ...good, execution_result:{ ...good.execution_result,provider:'unknown' } },
    ];
    for (const receipt of altered)
      expect(toolExecutionEvidence(tools,[success('calculator','calc-task')],[receipt])[1]?.state)
        .toBe('execution_recorded');
  });

  it('rejects absent, truncated, empty or length-forged original local-tool evidence', () => {
    const good = localApproval('calculator','calc-task');
    const bad = [
      undefined,
      { ...good.execution_result.tool_evidence,truncated:true },
      { ...good.execution_result.tool_evidence,characters:0,content:'' },
      { ...good.execution_result.tool_evidence,characters:100 },
      { ...good.execution_result.tool_evidence,format:'text' },
    ];
    for (const tool_evidence of bad)
      expect(toolExecutionEvidence(tools,[success('calculator','calc-task')],[{
        ...good,execution_result:{ ...good.execution_result,tool_evidence },
      }])[1]?.state).toBe('execution_recorded');
  });

  it('does not mistake simulated receipts or another task approval for browser execution', () => {
    const bogus = [
      { ...browserApproval, execution_result: { ...browserApproval.execution_result, simulated: true } },
      { ...browserApproval, execution_status: 'executing' },
      { ...browserApproval, details: { agent_task_id: 'other-task' } },
      { ...browserApproval, agent_id: 'foreign-agent' },
    ];
    for (const receipt of bogus)
      expect(toolExecutionEvidence(tools, [success('browser_task','browser-task')], [receipt])[0]?.state)
        .toBe('approval_activity');
  });

  it('never treats simulated successful output as real even with matching approval', () => {
    const runs = [
      { ...success('calculator','calc-task'), output:{ simulated:true } },
      { ...success('memory_search','memory-task'), output:{ result:{ simulated:true } } },
      { ...success('browser_task','browser-task'), output:{ simulated:true } },
    ];
    const evidence = toolExecutionEvidence(tools,runs,[browserApproval,localApproval('calculator','calc-task')]);
    for (const slug of ['calculator', 'memory_search', 'browser_task']) {
      const row = evidence.find(item => item.slug === slug);
      expect(row?.state).toBe('simulated_only');
      expect(row?.recordedSuccesses).toBe(0);
      expect(row?.simulatedExecutions).toBe(1);
    }
  });

  it('never certifies inactive, absent or merely pending approvals', () => {
    const inactive = [{ slug: 'browser_task', is_active: false, executable: true }];
    expect(toolExecutionEvidence(inactive, [success('browser_task','browser-task')], [browserApproval])[0]?.state)
      .toBe('not_executable');
    expect(toolExecutionEvidence(tools, [], [{
      ...browserApproval, execution_status: 'executing',
    }]).every(row => row.state === 'not_tested')).toBe(true);
  });
});

const approvedNetwork = (tool: string, task: string, input: Record<string, unknown>, output: Record<string, unknown>) => {
  const content = JSON.stringify(output);
  return {
    agent_id: 'owned-agent', action_type: 'agent_tool_task', status: 'approved', execution_status: 'succeeded',
    details: { agent_task_id: task, tool, input },
    execution_result: { provider: ({ web_search: 'web_search_http', web_fetch: 'public_https_fetch', http_request: 'public_https_get' } as Record<string, string>)[tool],
      agent_task_id: task, simulated: false, task_status: 'succeeded',
      tool_evidence: { format: 'json', characters: content.length, truncated: false, content },
    },
  };
};

describe('signed-in network execution receipt prerequisites', () => {
  const searchInput = { query: 'public agency report', limit: 5 };
  const searchOutput = { query: 'public agency report', results: [{ title: 'Agency', url: 'https://example.org/report', snippet: 'Public report' }] };
  const fetchInput = { url: 'https://httpbingo.org/html' };
  const fetchOutput = { url: 'https://httpbingo.org/html', text: 'Public HTML page body' };
  const httpInput = { url: 'https://httpbingo.org/html', method: 'GET' };
  const httpOutput = { ok: true, status: 200, body: 'Public GET response body' };
  const cases = [
    { name: 'web_search', input: searchInput, output: searchOutput },
    { name: 'web_fetch', input: fetchInput, output: fetchOutput },
    { name: 'http_request', input: httpInput, output: httpOutput },
  ];
  const networkTools = cases.map(item => ({ slug: item.name, is_active: true, executable: true }));

  it.each(cases)('requires matched agent, task, bounded request, completed receipt and original output for $name', ({name,input,output}) => {
    const execution = { ...success(name, 'network-task'), input };
    const receipt = approvedNetwork(name, 'network-task', input, output);
    expect(toolExecutionEvidence(networkTools, [execution], [receipt]).find(row => row.slug === name)?.state).toBe('network_verified');
    expect(toolExecutionEvidence(networkTools, [execution], []).find(row => row.slug === name)?.state).toBe('execution_recorded');
    const invalid = [
      { ...receipt, agent_id: 'another-agent' },
      { ...receipt, details: { ...receipt.details, agent_task_id: 'another-task' } },
      { ...receipt, execution_status: 'executing' },
      { ...receipt, execution_result: { ...receipt.execution_result, simulated: true } },
      { ...receipt, execution_result: { ...receipt.execution_result, provider: 'local' } },
      { ...receipt, execution_result: { ...receipt.execution_result, tool_evidence: { ...receipt.execution_result.tool_evidence, truncated: true } } },
    ];
    for (const bad of invalid) {
      expect(toolExecutionEvidence(networkTools, [execution], [bad]).find(row => row.slug === name)?.state).toBe('execution_recorded');
    }
    expect(toolExecutionEvidence(networkTools, [{ ...execution, input: { fake: true } }], [receipt]).find(row => row.slug === name)?.state).toBe('execution_recorded');
    expect(toolExecutionEvidence(networkTools, [{ ...execution, output: { simulated: true } }], [receipt]).find(row => row.slug === name)?.state).toBe('simulated_only');
  });

  it('rejects missing content, empty search, wrong fetch URL and a failed HTTP status without inflating certification', () => {
    const malformed = [
      { name: 'web_search', input: searchInput, output: { query: searchInput.query, results: [] } },
      { name: 'web_search', input: searchInput, output: { ...searchOutput, results: [{ title: 'Fake', url: 'http://invalid.example', snippet: 'Not HTTPS' }] } },
      { name: 'web_fetch', input: fetchInput, output: { ...fetchOutput, url: 'https://other.example/page' } },
      { name: 'web_fetch', input: fetchInput, output: { ...fetchOutput, text: '' } },
      { name: 'http_request', input: httpInput, output: { ...httpOutput, ok: false, status: 503 } },
      { name: 'http_request', input: httpInput, output: { ...httpOutput, body: '' } },
    ];
    for (const {name,input,output} of malformed) {
      const receipt = approvedNetwork(name,'network-task',input,output);
      expect(toolExecutionEvidence(networkTools,[{...success(name,'network-task'),input}],[receipt]).find(row => row.slug === name)?.state).toBe('execution_recorded');
    }
  });
});
