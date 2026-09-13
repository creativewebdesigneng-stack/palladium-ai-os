import { describe, expect, it } from 'vitest';
import {
  calculateDrawdown,
  calculatePositionSize,
  calculateRiskAmount,
  calculateRiskReward,
  calculateSimulationPnl,
  calculateUnitRisk,
} from './trading-risk';

describe('trading risk calculations', () => {
  it('calculates the explicit risk budget', () => {
    expect(calculateRiskAmount(25_000, 1)).toBe(250);
    expect(calculateRiskAmount(10_000, 0.5)).toBe(50);
  });

  it('calculates unit risk and position size without price direction assumptions', () => {
    expect(calculateUnitRisk(100, 97.5)).toBe(2.5);
    expect(calculatePositionSize(25_000, 1, 100, 97.5)).toBe(100);
    expect(calculatePositionSize(25_000, 1, 97.5, 100)).toBe(100);
  });

  it('returns zero when risk inputs cannot produce a meaningful size', () => {
    expect(calculatePositionSize(25_000, 1, 100, 100)).toBe(0);
    expect(calculatePositionSize(-1, 1, 100, 90)).toBe(0);
    expect(calculatePositionSize(25_000, 1, Number.NaN, 90)).toBe(0);
  });

  it('calculates scenario reward to risk', () => {
    expect(calculateRiskReward(100, 97.5, 107.5)).toBe(3);
    expect(calculateRiskReward(100, 100, 110)).toBe(0);
  });

  it('calculates simulated long and short P&L only when an exit exists', () => {
    expect(calculateSimulationPnl('long', 10, 100, 105)).toBe(50);
    expect(calculateSimulationPnl('short', 10, 100, 95)).toBe(50);
    expect(calculateSimulationPnl('long', 10, 100, null)).toBeNull();
  });

  it('calculates maximum peak-to-trough drawdown percentage', () => {
    expect(calculateDrawdown([100, 120, 90, 105, 80, 130])).toBeCloseTo(33.3333333, 5);
    expect(calculateDrawdown([])).toBe(0);
    expect(calculateDrawdown([0, -10, Number.NaN])).toBe(0);
  });
});
