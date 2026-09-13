import { describe, expect, it } from 'vitest';
import { marketAlertCooldownElapsed, marketThresholdTriggered } from './trading-alerts';

describe('trading market alert decisions', () => {
  it('uses strict above and below threshold comparisons', () => {
    expect(marketThresholdTriggered('above', 101, 100)).toBe(true);
    expect(marketThresholdTriggered('above', 100, 100)).toBe(false);
    expect(marketThresholdTriggered('below', 99, 100)).toBe(true);
    expect(marketThresholdTriggered('below', 100, 100)).toBe(false);
  });

  it('fails closed for non-finite observations', () => {
    expect(marketThresholdTriggered('above', Number.NaN, 100)).toBe(false);
    expect(marketThresholdTriggered('below', 99, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('allows the first notification and respects the configured cooldown', () => {
    const now = Date.parse('2026-09-13T18:00:00Z');
    expect(marketAlertCooldownElapsed(null, 1_440, now)).toBe(true);
    expect(marketAlertCooldownElapsed('2026-09-13T17:30:00Z', 60, now)).toBe(false);
    expect(marketAlertCooldownElapsed('2026-09-13T17:00:00Z', 60, now)).toBe(true);
  });

  it('treats an invalid stored timestamp as eligible rather than permanently suppressing notifications', () => {
    const now = Date.parse('2026-09-13T18:00:00Z');
    expect(marketAlertCooldownElapsed('not-a-date', 1_440, now)).toBe(true);
  });
});
