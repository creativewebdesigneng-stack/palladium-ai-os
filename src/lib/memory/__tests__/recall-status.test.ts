import { describe, expect, it } from 'vitest';
import { describeMemoryRecall } from '../recall-status';
describe('memory recall evidence labels', () => {
  it('identifies keyword-only results and their quota blocker', () => {
    const message = describeMemoryRecall({ semantic: 'unavailable', keyword: 'available', reason: 'quota' }, 1);
    expect(message).toBe('Keyword recall found 1 entry. Embedding quota or billing limit reached.');
  });
  it('keeps zero hits distinct from failed search', () => {
    expect(describeMemoryRecall({ semantic: 'available', keyword: 'available', reason: null }, 0)).toContain('Hybrid recall found 0 entries');
    expect(describeMemoryRecall({ semantic: 'unavailable', keyword: 'unavailable', reason: 'provider' }, 0)).toContain('search is unavailable');
  });
  it('does not claim full recall after a partial source failure', () => {
    expect(describeMemoryRecall({ semantic: 'partial', keyword: 'available', reason: 'provider' }, 2)).toContain('results may be incomplete');
  });
  it('avoids a semantic claim when no diagnostic receipt exists', () => {
    expect(describeMemoryRecall(null, 3)).toBe('Memory search returned 3 entries.');
  });
});
