import { describe, expect, it } from "vitest";
import { calculateDrawdown, calculatePositionSize, calculateRiskReward, TRADING_EXCHANGES } from "./trading-intelligence";

describe("Trading Hub intelligence helpers", () => {
  it("covers major global exchange regions", () => {
    expect(TRADING_EXCHANGES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(TRADING_EXCHANGES.map((exchange) => exchange.region)).size).toBeGreaterThanOrEqual(4);
    expect(TRADING_EXCHANGES.every((exchange) => exchange.officialUrl.startsWith("https://"))).toBe(true);
  });

  it("calculates position size from account risk and stop distance", () => {
    expect(calculatePositionSize(100_000, 1, 50, 48)).toEqual({
      riskCapital: 1000,
      riskPerUnit: 2,
      units: 500,
      notional: 25_000,
    });
  });

  it("calculates risk/reward without assuming trade direction", () => {
    expect(calculateRiskReward(100, 95, 115)).toEqual({ risk: 5, reward: 15, ratio: 3 });
    expect(calculateRiskReward(100, 105, 85)).toEqual({ risk: 5, reward: 15, ratio: 3 });
  });

  it("calculates drawdown and fails closed for invalid values", () => {
    expect(calculateDrawdown(100_000, 80_000)).toBe(20);
    expect(calculateDrawdown(0, 0)).toBeNull();
    expect(calculatePositionSize(100_000, 1, 50, 50)).toBeNull();
    expect(calculateRiskReward(100, 100, 120)).toBeNull();
  });
});
