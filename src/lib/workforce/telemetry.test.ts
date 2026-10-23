import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { mapAgentToWf, workforceSuccessRate, buildWorkforceOverview } from '@/components/workforce/normalize';
import AgentCard from '@/components/workforce/AgentCard';
vi.mock('@/lib/agents/agent-business-certification.functions', () => ({ getAgentBusinessCertification: vi.fn() }));
import AgentProfileDrawer, { Performance } from '@/components/workforce/AgentProfileDrawer';
import { STATUSES, STATUS_STYLE, TASK_STATUS_STYLE } from '@/components/workforce/wfData';

const agent = { id: 'a', name: 'QA', status: 'active', allowed_tools: ['browser_task'] };
describe('Workforce reflects persisted task states and available evidence', () => {
  it.each([
    ['waiting_for_tool', 'Working', 'Waiting for tool'],
    ['waiting_for_approval', 'Awaiting approval', 'Awaiting approval'],
    ['queued', 'Queued', 'Queued'],
    ['pending', 'Queued', 'Queued'],
  ])('keeps %s work visible on the agent and task', (status, agentStatus, taskStatus) => {
    const row = mapAgentToWf(agent, [{ agent_id: 'a', status, title: 'Read approved page' }]);
    expect(row.status).toBe(agentStatus);
    expect(row.currentTask).toBe('Read approved page');
    expect(row.tasks[0]?.status).toBe(taskStatus);
    expect(STATUSES).toContain(agentStatus);
    expect(STATUS_STYLE[agentStatus as keyof typeof STATUS_STYLE]).toBeTruthy();
    expect(TASK_STATUS_STYLE[taskStatus as keyof typeof TASK_STATUS_STYLE]).toBeTruthy();
    const html = renderToStaticMarkup(createElement(AgentCard, { agent: row, onOpen: () => {} }));
    expect(html).toContain(agentStatus);
    expect(html).toContain('Read approved page');
  });

  it.each([['paused', 'Paused'], ['archived', 'Offline']])('preserves %s agent state when work is only queued', (status, expected) => {
    const row = mapAgentToWf({ ...agent, status }, [{ agent_id: 'a', status: 'queued', title: 'Later' }]);
    expect(row.status).toBe(expected);
  });

  it('prioritises executing work over queued tasks regardless of list order', () => {
    const row = mapAgentToWf(agent, [
      { agent_id: 'a', status: 'queued', title: 'Later' },
      { agent_id: 'a', status: 'waiting_for_approval', title: 'Needs decision' },
      { agent_id: 'a', status: 'waiting_for_tool', title: 'Extracting' },
    ]);
    expect(row).toMatchObject({ status: 'Working', currentTask: 'Extracting' });
  });

  it('excludes other owners\' agent tasks and non-terminal states from measured success', () => {
    const row = mapAgentToWf(agent, [
      { agent_id: 'other', status: 'succeeded' },
      { agent_id: 'a', status: 'waiting_for_approval' },
      { agent_id: 'a', status: 'cancelled' },
    ]);
    expect(row.overview.tasksDone).toBe(0);
    expect(row.performance).toBeNull();
    expect(row.perfSeries).toEqual([]);
  });

  it('renders no measurements as unavailable in the card, overview and performance panel', () => {
    const row = mapAgentToWf(agent, []);
    const views = [
      createElement(AgentCard, { agent: row, onOpen: () => {} }),
      createElement(AgentProfileDrawer, { agent: row, onClose: () => {} }),
      createElement(Performance, { agent: row }),
    ];
    for (const view of views) {
      const html = renderToStaticMarkup(view);
      expect(html).toContain('>—<');
      expect(html).not.toContain('>0%<');
      expect(html).not.toContain('7-day trend');
    }
    expect(renderToStaticMarkup(views[2]!)).toContain('Daily performance history is not available.');
  });

  it('preserves measured 0% and 100% without inventing historical points', () => {
    const failed = mapAgentToWf(agent, [{ agent_id: 'a', status: 'failed' }]);
    const succeeded = mapAgentToWf(agent, [{ agent_id: 'a', status: 'succeeded' }]);
    expect(failed.performance).toBe(0);
    expect(succeeded.performance).toBe(100);
    expect(workforceSuccessRate(2, 1)).toBe(67);
    for (const row of [failed, succeeded]) {
      expect(row.perfSeries).toEqual([]);
      expect(renderToStaticMarkup(createElement(Performance, { agent: row }))).toContain(`>${row.performance}%<`);
    }
  });
});

it('uses the same actual runtime states and denominator for aggregate telemetry', () => {
  const statuses = ['running', 'waiting_for_tool', 'queued', 'pending', 'waiting_for_approval', 'succeeded', 'failed', 'cancelled'];
  const overview = buildWorkforceOverview([agent], statuses.map(status => ({ status })), {});
  expect(overview).toMatchObject({ runningTasks: 2, pendingTasks: 2, completedTasks: 1, failedTasks: 1, totalTasks: 8, performance: 50 });
  expect(buildWorkforceOverview([], [], {}).performance).toBeNull();
});
