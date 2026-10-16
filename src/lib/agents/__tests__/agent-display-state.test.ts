import { describe, expect, it } from 'vitest';
import { agentDisplayState } from '../agent-display-state';

describe('agent list evidence', () => {
  it('shows canonical memory off even with a legacy wizard preferences object', () => {
    const saved = { memory_enabled: false, preferences: { memory: { long: false, short: false } } };
    expect(agentDisplayState(saved).memory).toBe(false);
  });
  it('uses the same memory default as the existing runtime', () => {
    expect(agentDisplayState({}).memory).toBe(true);
    expect(agentDisplayState({ memory_enabled: true }).memory).toBe(true);
  });
  it('does not present creation or update timestamps as a run', () => {
    const neverRun = { created_at: '2026-10-16T18:00:00Z', updated_at: '2026-10-16T19:00:00Z', memory_enabled: false };
    expect(agentDisplayState(neverRun).lastRunAt).toBeNull();
    expect(agentDisplayState({ last_run_at: 'invalid' }).lastRunAt).toBeNull();
    expect(agentDisplayState({ last_run_at: '2026-10-16T19:00:00Z' }).lastRunAt).toBe('2026-10-16T19:00:00Z');
  });
  it('keeps a recorded zero score distinct from unavailable performance', () => {
    expect(agentDisplayState({}).score).toBeNull();
    expect(agentDisplayState({ preferences: { score: 0 } }).score).toBe(0);
    for (const score of [NaN, Infinity, -1, 101, '90']) {
      expect(agentDisplayState({ preferences: { score } }).score).toBeNull();
    }
  });
});
