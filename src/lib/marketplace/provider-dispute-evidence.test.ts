import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  resolveMarketplaceDisputeProviderIds,
  verifyMarketplaceProviderDispute,
} from "./provider-dispute-evidence";

const order = { sale_price_pence: 10000, currency: "GBP" };
const dispute = {
  id: "du_owned",
  charge: "ch_owned",
  payment_intent: "pi_owned",
  amount: 4000,
  currency: "gbp",
  livemode: false,
  status: "needs_response",
  reason: "fraudulent",
  created: 1_800_000_000,
  evidence_details: { due_by: 1_800_086_400 },
};

describe("Marketplace Stripe provider dispute reconciliation", () => {
  it("accepts documented provider states, partial disputed amounts and exact environment", () => {
    for (const status of [
      "warning_needs_response", "warning_under_review", "warning_closed",
      "needs_response", "under_review", "won", "lost", "prevented",
    ]) {
      expect(verifyMarketplaceProviderDispute({ ...dispute, status }, order, "sandbox"))
        .toMatchObject({ status, amountPence: 4000, currency: "GBP", livemode: false });
    }
    expect(verifyMarketplaceProviderDispute(
      { ...dispute, livemode: true, status: "won" }, order, "live",
    )).toMatchObject({ status: "won", livemode: true });
  });

  it("rejects mismatched currency, amount, environment and unknown dispute status", () => {
    for (const changed of [
      { amount: 0 }, { amount: 10001 }, { currency: "usd" },
      { livemode: true }, { status: "made_up_status" },
    ]) {
      expect(() => verifyMarketplaceProviderDispute(
        { ...dispute, ...changed }, order, "sandbox",
      )).toThrow("does not match");
    }
  });

  it("uses the dispute PaymentIntent when present and retrieves the Stripe charge when absent", async () => {
    const retrieve = vi.fn(async () => ({ payment_intent: "pi_from_charge" }));
    await expect(resolveMarketplaceDisputeProviderIds(dispute, retrieve)).resolves.toEqual({
      disputeId: "du_owned", chargeId: "ch_owned", paymentIntentId: "pi_owned",
    });
    expect(retrieve).not.toHaveBeenCalled();

    await expect(resolveMarketplaceDisputeProviderIds(
      { ...dispute, payment_intent: null }, retrieve,
    )).resolves.toEqual({
      disputeId: "du_owned", chargeId: "ch_owned", paymentIntentId: "pi_from_charge",
    });
    expect(retrieve).toHaveBeenCalledWith("ch_owned");
  });

  it("fails closed when signed dispute identity cannot be resolved", async () => {
    await expect(resolveMarketplaceDisputeProviderIds(
      { ...dispute, id: "bad" }, async () => ({ payment_intent: "pi_x" }),
    )).rejects.toThrow("dispute ID");
    await expect(resolveMarketplaceDisputeProviderIds(
      { ...dispute, charge: null }, async () => ({ payment_intent: "pi_x" }),
    )).rejects.toThrow("charge ID");
    await expect(resolveMarketplaceDisputeProviderIds(
      { ...dispute, payment_intent: null }, async () => ({ payment_intent: null }),
    )).rejects.toThrow("PaymentIntent");
  });

  it("keeps the provider dispute ledger party-readable but server-written", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/20260925234500_marketplace_provider_dispute_reconciliation.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("create table if not exists public.marketplace_provider_disputes");
    expect(sql).toContain("alter table public.marketplace_provider_disputes enable row level security");
    expect(sql).toContain("revoke all on public.marketplace_provider_disputes from anon, authenticated");
    expect(sql).toContain("grant select on public.marketplace_provider_disputes to authenticated");
    expect(sql).toContain("grant all on public.marketplace_provider_disputes to service_role");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("serializes provider dispute/order state and prevents terminal-state regression", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/20260925234500_marketplace_provider_dispute_reconciliation.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("for update;");
    expect(sql).toContain("v_existing.status in ('warning_closed','won','lost','prevented')");
    expect(sql).toContain("if v_terminal_existing and not v_terminal_incoming then");
    expect(sql).toContain("provider dispute terminal status conflict");
    expect(sql).toContain("p_status in ('needs_response','under_review','lost')");
    expect(sql).toContain("v_next_status := 'disputed'");
    expect(sql).toContain("p_status in ('won','prevented','warning_closed')");
    expect(sql).toContain("coalesce(v_order.refund_state,'none')='full'");
  });

  it("wires all documented Stripe dispute lifecycle events through the signed webhook", () => {
    const route = readFileSync(
      new URL("../../routes/api/public/payments/webhook.ts", import.meta.url),
      "utf8",
    );
    for (const type of [
      "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed",
      "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated",
    ]) expect(route).toContain(`case "${type}"`);
    expect(route).toContain("resolveMarketplaceDisputeProviderIds(");
    expect(route).toContain("verifyMarketplaceProviderDispute(dispute, order, env)");
    expect(route).toContain('"blackstar_reconcile_marketplace_provider_dispute"');
    expect(route).toContain('throw new Error("Could not reconcile the Stripe dispute with its Marketplace order.")');
  });
});
