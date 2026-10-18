import { describe, it, expect } from 'vitest';
import { workforceOutputText } from './output-text';
import { mapAgentToWf } from '@/components/workforce/normalize';
describe('Workforce persisted evidence presentation', () => {
  it('renders structured workflow results and preserves text', () => {
    expect(workforceOutputText({ text: 'Extracted page', steps: [1] })).toContain('Extracted page');
    expect(workforceOutputText({ text: 'Extracted page' })).not.toContain('[object Object]');
    expect(workforceOutputText('original')).toBe('original'); expect(workforceOutputText(null)).toBe('');
  });
  it('counts runtime succeeded tasks consistently with the overview', () => {
    const row = mapAgentToWf({ id: 'a', name: 'QA', allowed_tools: ['browser'], created_at: '2026-10-01' }, [{ agent_id: 'a', status: 'succeeded' }, { agent_id: 'a', status: 'completed' }, { agent_id: 'a', status: 'failed' }]);
    expect(row.overview.tasksDone).toBe(2); expect(row.performance).toBe(67); expect(row.tools).toEqual(['browser']); expect(row.tasks[0].status).toBe('Completed');
  });
});
