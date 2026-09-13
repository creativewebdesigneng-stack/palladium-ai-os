import { describe, expect, it } from "vitest";
import {
  averageTrueRange,
  bollingerBands,
  enrichTradingCandles,
  exponentialMovingAverage,
  relativeStrengthIndex,
  simpleMovingAverage,
  type TradingCandle,
} from "./indicators";

const candles: TradingCandle[] = Array.from({ length: 30 }, (_, index) => {
  const close = 100 + index;
  return {
    time: `2026-08-${String(index + 1).padStart(2, "0")}`,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000 + index,
  };
});

describe("trading indicators", () => {
  it("calculates SMA and EMA without look-ahead values", () => {
    const values = [1, 2, 3, 4, 5];
    expect(simpleMovingAverage(values, 3)).toEqual([null, null, 2, 3, 4]);
    expect(exponentialMovingAverage(values, 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("returns a high RSI for a persistent advance", () => {
    const values = Array.from({ length: 20 }, (_, index) => index + 1);
    expect(relativeStrengthIndex(values, 14).at(-1)).toBe(100);
  });

  it("calculates ATR and Bollinger bands from observed prices", () => {
    const atr = averageTrueRange(candles, 14);
    const bands = bollingerBands(candles.map((candle) => candle.close), 20, 2);
    expect(atr[12]).toBeNull();
    expect(atr[13]).toBeGreaterThan(0);
    expect(bands.upper[19]).toBeGreaterThan(bands.middle[19] ?? 0);
    expect(bands.lower[19]).toBeLessThan(bands.middle[19] ?? 0);
  });

  it("enriches every candle while keeping unavailable warm-up values explicit", () => {
    const enriched = enrichTradingCandles(candles);
    expect(enriched).toHaveLength(30);
    expect(enriched[10]?.sma20).toBeNull();
    expect(enriched[29]?.sma20).not.toBeNull();
    expect(enriched[29]?.rsi14).toBe(100);
  });
});
