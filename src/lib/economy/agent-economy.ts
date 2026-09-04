export type EconomyEntryKind = "credit" | "debit" | "escrow" | "release" | "refund";

export type EconomyEntry = {
  id: string;
  agentId: string;
  kind: EconomyEntryKind;
  amountMicros: number;
  currency: string;
  reference: string;
  createdAt: string;
};

export type AgentEconomyBalance = {
  agentId: string;
  currency: string;
  availableMicros: number;
  escrowMicros: number;
  earnedMicros: number;
  spentMicros: number;
};

function assertAmount(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("ECONOMY_INVALID_AMOUNT");
}

export function calculateAgentEconomyBalance(agentId: string, currency: string, entries: EconomyEntry[]): AgentEconomyBalance {
  const targetCurrency = currency.trim().toUpperCase();
  let availableMicros = 0;
  let escrowMicros = 0;
  let earnedMicros = 0;
  let spentMicros = 0;

  for (const entry of entries) {
    if (entry.agentId !== agentId || entry.currency.toUpperCase() !== targetCurrency) continue;
    assertAmount(entry.amountMicros);
    switch (entry.kind) {
      case "credit":
      case "refund":
        availableMicros += entry.amountMicros;
        earnedMicros += entry.kind === "credit" ? entry.amountMicros : 0;
        break;
      case "debit":
        availableMicros -= entry.amountMicros;
        spentMicros += entry.amountMicros;
        break;
      case "escrow":
        availableMicros -= entry.amountMicros;
        escrowMicros += entry.amountMicros;
        break;
      case "release":
        escrowMicros -= entry.amountMicros;
        spentMicros += entry.amountMicros;
        break;
    }
  }

  if (availableMicros < 0 || escrowMicros < 0) throw new Error("ECONOMY_LEDGER_INVARIANT");
  return { agentId, currency: targetCurrency, availableMicros, escrowMicros, earnedMicros, spentMicros };
}

export function canAffordAgentAction(balance: AgentEconomyBalance, estimatedCostMicros: number) {
  assertAmount(estimatedCostMicros);
  return balance.availableMicros >= estimatedCostMicros;
}
