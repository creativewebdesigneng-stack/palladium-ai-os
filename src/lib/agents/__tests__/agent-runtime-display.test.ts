import { describe, expect, it } from 'vitest';
import { agentRuntimeStates } from '../agent-display-state';

describe('agent runtime display', () => {
  it('keeps approval waits and queued work distinct from execution', () => {
    const states = agentRuntimeStates([
      { agent_id: 'waiting', status: 'waiting_for_approval' },
      { agent_id: 'legacy-wait', status: 'awaiting_approval' },
      { agent_id: 'queued', status: 'queued' },
      { agent_id: 'running', status: 'running' },
      { agent_id: 'done', status: 'succeeded' },
      { agent_id: 'failed', status: 'failed' },
      { agent_id: null, status: 'running' },
    ]);
    expect([...states]).toEqual([
      ['waiting', 'waiting_for_approval'], ['legacy-wait', 'awaiting_approval'],
      ['queued', 'queued'], ['running', 'running'],
    ]);
    expect([...states.values()].filter(status => status === 'running')).toHaveLength(1);
  });

  it('a running workflow step wins over an older paused task regardless of row order', () => {
    const rows = [
      { agent_id: 'agent', status: 'waiting_for_approval' },
      { agent_id: 'agent', status: 'queued' },
      { agent_id: 'agent', status: 'running' },
    ];
    expect(agentRuntimeStates(rows).get('agent')).toBe('running');
    expect(agentRuntimeStates([...rows].reverse()).get('agent')).toBe('running');
  });
});
