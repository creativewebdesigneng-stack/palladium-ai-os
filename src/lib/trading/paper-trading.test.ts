import { describe, expect, it } from "vitest";
import { paperPositionPnl, simulatePaperOrder, validatePaperOrder } from "./paper-trading";

describe("paper trading simulator", () => {
  it("fills market orders only at the supplied paper reference price", () => {
    const fill = simulatePaperOrder({
      symbol: "msft",
      side: "buy",
      orderType: "market",
      quantity: 5,
      referencePrice: 100,
    });
    expect(fill).toMatchObject({ symbol: "MSFT", status: "filled", fillPrice: 100, notional: 500 });
  });

  it("keeps non-marketable paper limit orders pending", () => {
    const fill = simulatePaperOrder({
      symbol: "MSFT",
      side: "buy",
      orderType: "limit",
      quantity: 2,
      referencePrice: 105,
      limitPrice: 100,
    });
    expect(fill.status).toBe("pending");
  });

  it("rejects invalid size and price inputs", () => {
    expect(() => validatePaperOrder({ symbol: "MSFT", side: "buy", orderType: "market", quantity: 0, referencePrice: 100 }))
      .toThrow("Quantity");
    expect(() => validatePaperOrder({ symbol: "MSFT", side: "buy", orderType: "limit", quantity: 1, referencePrice: 100, limitPrice: 0 }))
      .toThrow("Limit orders");
  });

  it("calculates long and short paper P&L deterministically", () => {
    expect(paperPositionPnl({ side: "buy", quantity: 10, entryPrice: 100, currentPrice: 105 })).toBe(50);
    expect(paperPositionPnl({ side: "sell", quantity: 10, entryPrice: 100, currentPrice: 95 })).toBe(50);
  });
});
