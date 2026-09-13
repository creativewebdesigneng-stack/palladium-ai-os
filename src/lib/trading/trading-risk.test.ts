import { describe, expect, it } from 'vitest';
import {
  calculateDrawdown,
  calculateExposurePercent,
  calculateMaximumLoss,
  calculatePercentageReturn,
  calculatePositionExposure,
  calculatePositionSize,
  calculateRiskAmount,
  calculateRiskReward,
  calculateSimulationPnl,
  calculateUnitRisk,
  summarizeManualPortfolioExposure,
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

  it('calculates maximum loss from quantity and stop distance', () => {
    expect(calculateMaximumLoss(100, 50, 48)).toBe(200);
    expect(calculateMaximumLoss(100, 50, 50)).toBe(0);
  });

  it('calculates percentage return for long and short simulations', () => {
    expect(calculatePercentageReturn('long', 100, 110)).toBeCloseTo(10);
    expect(calculatePercentageReturn('short', 100, 90)).toBeCloseTo(10);
    expect(calculatePercentageReturn('long', 100, null)).toBeNull();
  });

  it('calculates position and portfolio exposure deterministically', () => {
    expect(calculatePositionExposure(25, 80)).toBe(2000);
    expect(calculateExposurePercent(2000, 10_000)).toBe(20);
    expect(calculateExposurePercent(2000, 0)).toBe(0);
  });

  it('summarises manual holdings without mixing currencies', () => {
    const summary = summarizeManualPortfolioExposure([
      { symbol: 'AAA', asset_type: 'stock', manual_value: 600, currency: 'GBP' },
      { symbol: 'BBB', asset_type: 'etf', manual_value: 400, currency: 'GBP' },
      { symbol: 'CCC', asset_type: 'stock', manual_value: 500, currency: 'USD' },
      { symbol: 'DDD', asset_type: 'bond', manual_value: null, currency: 'USD' },
    ]);

    expect(summary).toHaveLength(2);
    expect(summary[0]).toMatchObject({
      currency: 'GBP',
      total: 1000,
      valuedCount: 2,
      unvaluedCount: 0,
      largestSymbol: 'AAA',
      largestPercent: 60,
    });
    expect(summary[0]?.assetExposure).toEqual([
      { assetType: 'stock', value: 600, percent: 60 },
      { assetType: 'etf', value: 400, percent: 40 },
    ]);
    expect(summary[1]).toMatchObject({
      currency: 'USD',
      total: 500,
      valuedCount: 1,
      unvaluedCount: 1,
      largestSymbol: 'CCC',
      largestPercent: 100,
    });
  });

  it('calculates maximum peak-to-trough drawdown percentage', () => {
    expect(calculateDrawdown([100, 120, 90, 105, 80, 130])).toBeCloseTo(33.3333333, 5);
    expect(calculateDrawdown([])).toBe(0);
    expect(calculateDrawdown([0, -10, Number.NaN])).toBe(0);
  });
});
