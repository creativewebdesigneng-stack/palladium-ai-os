import { describe, expect, it } from 'vitest';
import { isReplayRequest } from './replay';

describe('mobile replay guard', () => {
  it('detects duplicate request identifiers', () => {
    expect(isReplayRequest('r1', [{ requestId: 'r1', seenAt: '2026-09-17T17:00:00.000Z' }])).toBe(true);
    expect(isReplayRequest('r2', [{ requestId: 'r1', seenAt: '2026-09-17T17:00:00.000Z' }])).toBe(false);
  });
});
