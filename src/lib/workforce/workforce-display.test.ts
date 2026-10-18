import { describe, expect, it } from 'vitest';
import { mapAgentToWf } from '@/components/workforce/normalize';
import { workflowDisplayText, workforceUsageTotals } from './workflow-display';
describe('Workforce persisted runtime evidence', () => {
  it('counts succeeded and legacy completed consistently and uses persisted tools/timestamps', () => {
    const mapped = mapAgentToWf({ id: 'a', name: 'QA', allowed_tools: ['browser_task'], created_at: '2026-10-17T12:00:00Z' }, [
      { agent_id: 'a', status: 'succeeded' }, { agent_id: 'a', status: 'completed' }, { agent_id: 'a', status: 'failed' },
      { agent_id: 'other', status: 'succeeded' }, { agent_id: 'a', status: 'waiting_for_approval' },
    ]);
    expect(mapped.overview.tasksDone).toBe(2); expect(mapped.performance).toBe(67);
    expect(mapped.tools).toEqual(['browser_task']); expect(mapped.overview.created).not.toBe('—');
    expect(mapped.tasks.at(-1)!.status).toBe('Awaiting approval');
  });
  it('renders objects/arrays without lossy coercion while preserving text and empty output', () => {
    expect(workflowDisplayText({ result: { heading: 'Herman Melville' } })).toContain('"heading": "Herman Melville"');
    expect(workflowDisplayText([1, 2])).toBe('[\n  1,\n  2\n]');
    expect(workflowDisplayText('original')).toBe('original'); expect(workflowDisplayText(null)).toBe('');
  });
});


it('reads numeric usage totals without rendering entitlement or recent-record objects as metrics', () => {
  expect(workforceUsageTotals({ totals: { agent_task: 4, ai_tokens: 350, invalid: {}, nan: NaN, negative: -1 }, recent: [{ metric: 'agent_task' }], entitlements: { usage: {} } })).toEqual({ agent_task: 4, ai_tokens: 350 });
  expect(workforceUsageTotals(null)).toEqual({});
});
