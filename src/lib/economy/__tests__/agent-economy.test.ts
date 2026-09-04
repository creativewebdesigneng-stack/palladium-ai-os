import { describe, expect, it } from "vitest";
import { calculateAgentEconomyBalance, canAffordAgentAction, type EconomyEntry } from "../agent-economy";

const entry = (kind: EconomyEntry["kind"], amountMicros: number): EconomyEntry => ({
  id: `${kind}-${amountMicros}`,
  agentId: "agent-1",
  kind,
  amountMicros,
  currency: "GBP",
  reference: "test",
  createdAt: "2026-09-04T10:00:00.000Z",
});

describe("agent economy", () => {
  it("tracks credits, spend and escrow deterministically", () => {
    const balance = calculateAgentEconomyBalance("agent-1", "gbp", [
      entry("credit", 1_000_000),
      entry("escrow", 250_000),
      entry("release", 100_000),
      entry("refund", 50_000),
    ]);
    expect(balance).toEqual({
      agentId: "agent-1",
      currency: "GBP",
      availableMicros: 800_000,
      escrowMicros: 150_000,
      earnedMicros: 1_000_000,
      spentMicros: 100_000,
    });
    expect(canAffordAgentAction(balance, 800_000)).toBe(true);
    expect(canAffordAgentAction(balance, 800_001)).toBe(false);
  });

  it("fails closed when ledger would go negative", () => {
    expect(() => calculateAgentEconomyBalance("agent-1", "GBP", [entry("debit", 1)])).toThrow("ECONOMY_LEDGER_INVARIANT");
  });

  it("rejects unsafe monetary amounts", () => {
    expect(() => calculateAgentEconomyBalance("agent-1", "GBP", [entry("credit", 0)])).toThrow("ECONOMY_INVALID_AMOUNT");
  });
});
