import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadMemoryPreferences: vi.fn(),
  storeMemory: vi.fn(),
}));
vi.mock('@/lib/memory/preferences.server', () => ({
  loadMemoryPreferences: mocks.loadMemoryPreferences,
}));
vi.mock('@/lib/memory/memory.server', () => ({
  storeMemory: mocks.storeMemory,
}));
import { captureCompletedAgentRunMemory } from './agent-run-memory.server';

const sb = { from: vi.fn(), rpc: vi.fn() };
const run = {
  sb,
  userId: 'operator-1',
  agent: { id: 'agent-1', name: 'Helpful agent', memory_enabled: true },
  orgId: 'org-1',
  taskId: 'task-1',
  request: 'Review the source material.',
  outcome: 'A short reviewed summary.',
  provider: 'compatible',
  model: 'test-model',
};
const preferences = {
  auto_capture: true,
  capture_sensitive: false,
  short_term_enabled: true,
  long_term_enabled: true,
  document_memory_enabled: true,
  organisation_sharing_enabled: false,
  short_term_ttl_minutes: 120,
  retention_days: 30,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadMemoryPreferences.mockResolvedValue({ ...preferences });
  mocks.storeMemory.mockResolvedValue({ id: 'canonical-memory-1' });
});

describe('agent run automatic memory capture', () => {
  it('writes a single canonical, privacy-checked agent memory, without a duplicate legacy insert', async () => {
    expect(await captureCompletedAgentRunMemory(run)).toBe(true);
    expect(mocks.loadMemoryPreferences).toHaveBeenCalledWith(sb, 'operator-1');
    expect(mocks.storeMemory).toHaveBeenCalledTimes(1);
    expect(mocks.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'operator-1',
      prefs: expect.objectContaining({ auto_capture: true, capture_sensitive: false }),
      input: expect.objectContaining({
        agent_id: 'agent-1', org_id: 'org-1', task_id: 'task-1',
        automatic: true, scope: 'agent', memory_type: 'short_term',
        content: 'Task: Review the source material.\nOutcome: A short reviewed summary.',
      }),
    }));
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('does not write when automatic capture or short-term memory is disabled', async () => {
    for (const patch of [
      { auto_capture: false },
      { short_term_enabled: false },
    ]) {
      mocks.loadMemoryPreferences.mockResolvedValueOnce({ ...preferences, ...patch });
      expect(await captureCompletedAgentRunMemory(run)).toBe(false);
    }
    expect(mocks.storeMemory).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('treats an unreadable privacy preference as unknown consent rather than persisting history', async () => {
    mocks.loadMemoryPreferences.mockRejectedValueOnce(new Error('Preferences unavailable'));
    await expect(captureCompletedAgentRunMemory(run)).rejects.toThrow('Preferences unavailable');
    expect(mocks.storeMemory).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('respects an agent with memory disabled and an empty result', async () => {
    expect(await captureCompletedAgentRunMemory({
      ...run, agent: { ...run.agent, memory_enabled: false },
    })).toBe(false);
    expect(await captureCompletedAgentRunMemory({ ...run, outcome: '  ' })).toBe(false);
    expect(mocks.loadMemoryPreferences).not.toHaveBeenCalled();
    expect(mocks.storeMemory).not.toHaveBeenCalled();
  });

  it('does not retry in an alternate table when canonical sanitisation declines sensitive content', async () => {
    mocks.storeMemory.mockResolvedValueOnce(null);
    expect(await captureCompletedAgentRunMemory(run)).toBe(false);
    expect(mocks.storeMemory).toHaveBeenCalledTimes(1);
    expect(sb.from).not.toHaveBeenCalled();
  });
});
