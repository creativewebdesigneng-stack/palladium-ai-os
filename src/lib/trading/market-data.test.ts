import { describe, expect, it } from "vitest";
import {
  buildAlphaVantageUrl,
  normaliseTradingSymbol,
  parseAlphaVantageSeries,
} from "./market-data";

describe("trading market data adapter", () => {
  it("normalises equity, FX and crypto symbols", () => {
    expect(normaliseTradingSymbol("equity", " msft ").display).toBe("MSFT");
    expect(normaliseTradingSymbol("fx", "eur/usd").display).toBe("EUR/USD");
    expect(normaliseTradingSymbol("crypto", "btc-usd").display).toBe("BTC/USD");
  });

  it("builds provider URLs without changing the requested pair", () => {
    const equity = buildAlphaVantageUrl("equity", "IBM", "test-key");
    expect(equity.url.searchParams.get("function")).toBe("TIME_SERIES_DAILY");
    expect(equity.url.searchParams.get("symbol")).toBe("IBM");
    expect(equity.url.searchParams.get("apikey")).toBe("test-key");

    const fx = buildAlphaVantageUrl("fx", "GBP/USD", "test-key");
    expect(fx.url.searchParams.get("function")).toBe("FX_DAILY");
    expect(fx.url.searchParams.get("from_symbol")).toBe("GBP");
    expect(fx.url.searchParams.get("to_symbol")).toBe("USD");
  });

  it("parses a daily OHLCV series in chronological order", () => {
    const parsed = parseAlphaVantageSeries({
      "Time Series (Daily)": {
        "2026-09-12": { "1. open": "101", "2. high": "104", "3. low": "100", "4. close": "103", "5. volume": "1500" },
        "2026-09-11": { "1. open": "99", "2. high": "102", "3. low": "98", "4. close": "101", "5. volume": "1200" },
      },
    }, "equity", "TEST");

    expect(parsed.symbol).toBe("TEST");
    expect(parsed.asOf).toBe("2026-09-12");
    expect(parsed.candles.map((row) => row.time)).toEqual(["2026-09-11", "2026-09-12"]);
    expect(parsed.candles[1]?.close).toBe(103);
  });

  it("fails explicitly on provider throttling or error messages", () => {
    expect(() => parseAlphaVantageSeries({ Note: "Rate limit reached" }, "equity", "TEST"))
      .toThrow("Rate limit reached");
  });
});
