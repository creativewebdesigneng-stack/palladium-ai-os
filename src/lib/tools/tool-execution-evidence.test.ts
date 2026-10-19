import { describe, expect, it } from 'vitest';
import { toolExecutionEvidence } from './tool-execution-evidence';

const tools = ['browser_task', 'calculator', 'web_search', 'integration_action', 'request_approval', 'memory_search']
  .map(slug => ({ slug, is_active: true, executable: true }));
const approvals = [{
  action_type: 'agent_browser_task', status: 'approved', execution_status: 'succeeded',
  execution_result: {
    provider: 'playwright', simulated: false, task_status: 'succeeded',
    agent_task_id: 'task-real',
  },
}];

describe('agent tool evidence classification', () => {
  it('requires an actual matching browser execution plus non-simulated approval receipt', () => {
    const runs = [
      { tool: 'browser_task', status: 'succeeded', agent_task_id: 'task-real' },
      { tool: 'calculator', status: 'succeeded' },
      { tool: 'web_search', status: 'failed' },
      { tool: 'integration_action', status: 'succeeded' },
      { tool: 'request_approval', status: 'succeeded' },
    ];
    const states = new Map(toolExecutionEvidence(tools, runs, approvals).map(row => [row.slug, row.state]));
    expect(states.get('browser_task')).toBe('browser_verified');
    expect(states.get('calculator')).toBe('execution_recorded');
    expect(states.get('web_search')).toBe('failed_only');
    expect(states.get('integration_action')).toBe('approval_activity');
    expect(states.get('request_approval')).toBe('approval_activity');
    expect(states.get('memory_search')).toBe('not_tested');
  });

  it('does not mistake model claims, simulated receipts or other task approvals for browser execution', () => {
    const runs = [{ tool: 'browser_task', status: 'succeeded', agent_task_id: 'task-real' }];
    const bogus = [
      { ...approvals[0]!, execution_result: { ...approvals[0]!.execution_result, simulated: true } },
      { ...approvals[0]!, execution_status: 'executing' },
      { ...approvals[0]!, execution_result: { ...approvals[0]!.execution_result, agent_task_id: 'other-task' } },
    ];
    for (const receipt of bogus) {
      expect(toolExecutionEvidence(tools, runs, [receipt]).find(row => row.slug === 'browser_task')?.state)
        .toBe('approval_activity');
    }
    expect(toolExecutionEvidence(tools, runs, []).find(row => row.slug === 'browser_task')?.state)
      .toBe('approval_activity');
  });

  it('never certifies inactive or absent tools or pending approval requests', () => {
    const inactive = [{ slug: 'browser_task', is_active: false, executable: true }];
    expect(toolExecutionEvidence(inactive, [{ tool: 'browser_task', status: 'succeeded', agent_task_id: 'task-real' }], approvals)[0]?.state)
      .toBe('not_executable');
    expect(toolExecutionEvidence(tools, [], [{
      ...approvals[0]!, execution_status: 'executing',
    }]).every(row => row.state === 'not_tested')).toBe(true);
  });
});
