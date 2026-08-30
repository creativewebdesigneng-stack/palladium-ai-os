import { describe, expect, it } from 'vitest';
import { SEEDREAM_PROMPT_COLLECTIONS } from './builtin-seedream-prompts';

describe('Seedream production prompt pack', () => {
  it('covers all fifteen audited production categories exactly once', () => {
    expect(SEEDREAM_PROMPT_COLLECTIONS).toHaveLength(15);
    expect(new Set(SEEDREAM_PROMPT_COLLECTIONS.map((item) => item.name)).size).toBe(15);
    expect(new Set(SEEDREAM_PROMPT_COLLECTIONS.map((item) => item.sourceRef)).size).toBe(15);
  });

  it('keeps production safety and acceptance guidance in every collection', () => {
    for (const item of SEEDREAM_PROMPT_COLLECTIONS) {
      expect(item.promptText).toContain('Invariants:');
      expect(item.promptText).toContain('Avoid:');
      expect(item.promptText).toContain('Acceptance checks:');
      expect(item.promptText).toContain('do not invent');
    }
  });
});
