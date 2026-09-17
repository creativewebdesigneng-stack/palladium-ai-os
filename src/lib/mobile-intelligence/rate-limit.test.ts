import { describe, expect, it } from 'vitest';
import { withinMobileRateLimit } from './rate-limit';

describe('mobile rate limits', () => {
  it('blocks a saturated active window', () => {
    expect(withinMobileRateLimit({ count: 60, windowStartedAt: '2026-09-17T17:00:00.000Z' }, new Date('2026-09-17T17:00:30.000Z'))).toBe(false);
  });
  it('allows a new window', () => {
    expect(withinMobileRateLimit({ count: 60, windowStartedAt: '2026-09-17T17:00:00.000Z' }, new Date('2026-09-17T17:02:00.000Z'))).toBe(true);
  });
});
