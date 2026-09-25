import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildMarketplaceRefundEventRow, planMarketplaceRefundReconciliation } from "./refund-reconciliation";

const order = {
  id: "order-1",
  sale_price_pence: 10000,
  currency: "GBP",
  status: "fulfilled",
  refunded_pence: 0,
  refund_state: "none",
};
const partial = {
  id: "ch_owned",
  payment_intent: "pi_owned",
  amount: 10000,
  amount_refunded: 2500,
  currency: "gbp",
  refunded: false,
  livemode: false,
};

describe("Marketplace cumulative refund accounting", () => {
  it("advances a partial provider refund without claiming the order is fully refunded", () => {
    expect(planMarketplaceRefundReconciliation(partial, order, "sandbox")).toEqual({
      providerState: "partial",
      disposition: "advance",
      cumulativeRefundedPence: 2500,
      refundState: "partial",
      nextOrderStatus: "fulfilled",
    });
  });

  it("advances a full refund and only plans refunded workflow status from paid/fulfilled", () => {
    const full = { ...partial, amount_refunded: 10000, refunded: true };
    expect(planMarketplaceRefundReconciliation(full, order, "sandbox")).toMatchObject({
      providerState: "full", disposition: "advance", cumulativeRefundedPence: 10000,
      refundState: "full", nextOrderStatus: "refunded",
    });
    expect(planMarketplaceRefundReconciliation(full, { ...order, status: "disputed" }, "sandbox"))
      .toMatchObject({ refundState: "full", nextOrderStatus: "disputed" });
  });

  it("never moves cumulative refund accounting backwards on out-of-order events", () => {
    expect(planMarketplaceRefundReconciliation(
      partial, { ...order, refunded_pence: 5000, refund_state: "partial" }, "sandbox",
    )).toMatchObject({
      disposition: "stale", cumulativeRefundedPence: 5000,
      refundState: "partial", nextOrderStatus: "fulfilled",
    });
    expect(planMarketplaceRefundReconciliation(
      { ...partial, amount_refunded: 5000 },
      { ...order, refunded_pence: 5000, refund_state: "partial" },
      "sandbox",
    )).toMatchObject({ disposition: "duplicate", cumulativeRefundedPence: 5000 });
  });

  it("rejects impossible persisted state and non-payable workflow state", () => {
    expect(() => planMarketplaceRefundReconciliation(
      partial, { ...order, refunded_pence: 12000 }, "sandbox",
    )).toThrow("invalid persisted");
    expect(() => planMarketplaceRefundReconciliation(
      partial, { ...order, status: "pending" }, "sandbox",
    )).toThrow("cannot accept");
  });

  it("builds an immutable signed-provider audit row", () => {
    const plan = planMarketplaceRefundReconciliation(partial, order, "sandbox");
    expect(buildMarketplaceRefundEventRow("evt_refund1", partial, order, "sandbox", plan)).toEqual({
      order_id: "order-1",
      stripe_event_id: "evt_refund1",
      stripe_charge_id: "ch_owned",
      stripe_payment_intent_id: "pi_owned",
      cumulative_refunded_pence: 2500,
      currency: "GBP",
      refund_state: "partial",
      livemode: false,
    });
    expect(() => buildMarketplaceRefundEventRow("bad", partial, order, "sandbox", plan))
      .toThrow("authoritative Stripe identifiers");
  });

  it("adds a party-readable but service-role-written refund ledger without weakening settlement writes", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20260925225500_marketplace_refund_amount_ledger.sql", import.meta.url), "utf8");
    expect(sql).toContain("create table if not exists public.marketplace_refund_events");
    expect(sql).toContain("add column if not exists refunded_pence");
    expect(sql).toContain("add column if not exists refund_state");
    expect(sql).toContain("revoke all on public.marketplace_refund_events from anon, authenticated");
    expect(sql).toContain("grant select on public.marketplace_refund_events to authenticated");
    expect(sql).toContain("grant all on public.marketplace_refund_events to service_role");
    expect(sql).toContain("o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid())");
  });

  it("persists amount truth before audit completion and verifies any event-id collision", () => {
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    const refund = route.slice(route.indexOf('case "charge.refunded"'), route.indexOf("    default:", route.indexOf('case "charge.refunded"')));
    expect(refund).toContain('refunded_pence: plan.cumulativeRefundedPence');
    expect(refund).toContain('refund_state: plan.refundState');
    expect(refund).toContain('await recordMarketplaceRefundAudit(db, event, charge, order, env, plan)');
    const audit = route.slice(route.indexOf("async function recordMarketplaceRefundAudit("), route.indexOf("async function handleWebhook("));
    expect(audit).toContain('.from("marketplace_refund_events").insert(row)');
    expect(audit).toContain('if (error.code === "23505")');
    expect(audit).toContain('.eq("stripe_event_id", event.id)');
    expect(audit).toContain('throw new Error("Could not persist the verified Marketplace refund event.")');
  });
});
