import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildMarketplaceProviderDisputeRows,
  compareProviderDisputeChronology,
  planMarketplaceProviderDisputeOrderState,
  resolveMarketplacePreDisputeStatus,
  verifyMarketplaceProviderDispute,
} from "./provider-dispute-evidence";

const order = {
  id: "order-1",
  status: "fulfilled",
  sale_price_pence: 12000,
  currency: "GBP",
  payment_provider: "stripe",
  stripe_payment_intent_id: "pi_owned",
  refund_state: "none",
  paid_at: "2026-09-25T10:00:00.000Z",
  fulfilled_at: "2026-09-25T11:00:00.000Z",
};
const dispute = {
  id: "du_owned",
  charge: "ch_owned",
  payment_intent: "pi_owned",
  amount: 3000,
  currency: "gbp",
  livemode: false,
  status: "needs_response",
  reason: "product_not_received",
  evidence_details: { due_by: 1790280000 },
};

describe("Marketplace provider dispute truth", () => {
  it("accepts the exact signed Marketplace dispute identity and classifies active/won/lost states", () => {
    expect(verifyMarketplaceProviderDispute(dispute, order, "sandbox").outcome).toBe("active");
    expect(verifyMarketplaceProviderDispute({ ...dispute, status: "won" }, order, "sandbox").outcome).toBe("won");
    expect(verifyMarketplaceProviderDispute({ ...dispute, status: "warning_closed" }, order, "sandbox").outcome).toBe("won");
    expect(verifyMarketplaceProviderDispute({ ...dispute, status: "prevented" }, order, "sandbox").outcome).toBe("won");
    expect(verifyMarketplaceProviderDispute({ ...dispute, status: "lost" }, order, "sandbox").outcome).toBe("lost");
  });

  it("rejects wrong order identity, amount, currency, environment, provider and unknown statuses", () => {
    for (const changed of [
      { payment_intent: "pi_other" },
      { amount: 12001 },
      { amount: 0 },
      { currency: "usd" },
      { livemode: true },
      { status: "mystery" },
      { id: "not-dispute" },
      { charge: "not-charge" },
    ]) {
      expect(() => verifyMarketplaceProviderDispute({ ...dispute, ...changed }, order, "sandbox")).toThrow("does not match");
    }
    expect(() => verifyMarketplaceProviderDispute(dispute, { ...order, payment_provider: "other" }, "sandbox")).toThrow("does not match");
  });

  it("captures the verified pre-dispute state and restores only when safe", () => {
    expect(resolveMarketplacePreDisputeStatus(order, null)).toBe("fulfilled");
    expect(resolveMarketplacePreDisputeStatus({ ...order, status: "disputed" }, { pre_dispute_status: "paid" })).toBe("paid");
    expect(planMarketplaceProviderDisputeOrderState("active", order, "fulfilled")).toBe("disputed");
    expect(planMarketplaceProviderDisputeOrderState("won", { ...order, status: "disputed" }, "fulfilled")).toBe("fulfilled");
    expect(planMarketplaceProviderDisputeOrderState("lost", { ...order, status: "disputed" }, "fulfilled")).toBe("charged_back");
    expect(planMarketplaceProviderDisputeOrderState("lost", { ...order, status: "disputed", refund_state: "full" }, "fulfilled")).toBe("refunded");
    expect(() => planMarketplaceProviderDisputeOrderState("won", { ...order, status: "disputed" }, null)).toThrow("pre-dispute");
  });

  it("builds signed current/audit rows and rejects invalid event chronology", () => {
    const verified = verifyMarketplaceProviderDispute(dispute, order, "sandbox");
    const rows = buildMarketplaceProviderDisputeRows(
      { id: "evt_dispute1", created: 1790270000 },
      dispute, order, "sandbox", verified, "fulfilled",
    );
    expect(rows.current).toMatchObject({
      order_id: "order-1",
      stripe_dispute_id: "du_owned",
      stripe_charge_id: "ch_owned",
      stripe_payment_intent_id: "pi_owned",
      disputed_pence: 3000,
      currency: "GBP",
      provider_status: "needs_response",
      pre_dispute_status: "fulfilled",
      livemode: false,
      last_event_id: "evt_dispute1",
    });
    expect(rows.audit).toMatchObject({
      stripe_event_id: "evt_dispute1",
      stripe_dispute_id: "du_owned",
      provider_status: "needs_response",
    });
    expect(compareProviderDisputeChronology(rows.eventCreatedAt, null)).toBe("newer");
    expect(compareProviderDisputeChronology(rows.eventCreatedAt, {
      last_event_created_at: rows.eventCreatedAt, last_event_id: "evt_other",
    })).toBe("same");
    expect(compareProviderDisputeChronology("2026-09-25T12:00:00.000Z", {
      last_event_created_at: "2026-09-25T13:00:00.000Z",
    })).toBe("stale");
    expect(() => buildMarketplaceProviderDisputeRows(
      { id: "bad", created: 1790270000 }, dispute, order, "sandbox", verified, "fulfilled",
    )).toThrow("authoritative Stripe");
  });

  it("adds party-readable provider dispute audit ledgers but service-role-only writes", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20260925233500_marketplace_provider_disputes.sql", import.meta.url), "utf8");
    expect(sql).toContain("'charged_back'");
    expect(sql).toContain("create table if not exists public.marketplace_provider_disputes");
    expect(sql).toContain("create table if not exists public.marketplace_provider_dispute_events");
    expect(sql).toContain("last_event_created_at timestamptz not null");
    expect(sql).toContain("stripe_event_created_at timestamptz not null");
    expect(sql).toContain("revoke all on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events");
    expect(sql).toContain("grant select on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events");
    expect(sql).toContain("grant all on public.marketplace_provider_disputes, public.marketplace_provider_dispute_events");
  });

  it("routes all provider dispute lifecycle events through monotonic compare-and-set reconciliation", () => {
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    const start = route.indexOf('case "charge.dispute.created"');
    const end = route.indexOf('case "charge.refunded"', start);
    const block = route.slice(start, end);
    expect(block).toContain('case "charge.dispute.updated"');
    expect(block).toContain('case "charge.dispute.closed"');
    expect(block).toContain("resolveMarketplaceDisputePaymentIntent");
    expect(block).toContain("verifyMarketplaceProviderDispute(dispute, order, env)");
    expect(block).toContain("compareProviderDisputeChronology(rows.eventCreatedAt, existing)");
    expect(block).toContain('if (chronology === "stale")');
    expect(block).toContain('.eq("last_event_id", existing.last_event_id)');
    expect(block).toContain('.eq("last_event_created_at", existing.last_event_created_at)');
    expect(block).toContain("planMarketplaceProviderDisputeOrderState");
    expect(block).toContain('throw new Error("Marketplace order changed concurrently during provider dispute reconciliation.")');
    expect(block).toContain("recordMarketplaceProviderDisputeAudit");
  });
});
