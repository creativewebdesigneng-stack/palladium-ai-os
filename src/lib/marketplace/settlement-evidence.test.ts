import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildMarketplaceSettlementEvidence,
  resolveMarketplaceSettlementProviderObjects,
} from "./settlement-evidence";

const order = {
  id: "11111111-1111-4111-8111-111111111111",
  seller_id: "22222222-2222-4222-8222-222222222222",
  sale_price_pence: 10000,
  platform_fee_pence: 200,
  currency: "GBP",
  payment_provider: "stripe",
  stripe_payment_intent_id: "pi_market1",
};
const paymentIntent = {
  id: "pi_market1", amount: 10000, currency: "gbp", livemode: false,
  metadata: {
    kind: "marketplace_purchase",
    order_id: order.id,
    seller_id: order.seller_id,
  },
};
const charge = {
  id: "ch_market1", payment_intent: "pi_market1", amount: 10000,
  currency: "gbp", livemode: false, paid: true, status: "succeeded",
  transfer: "tr_market1", application_fee: "fee_market1",
  application_fee_amount: 200,
  transfer_data: { destination: "acct_seller1" },
};
const transfer = {
  id: "tr_market1", source_transaction: "ch_market1", destination: "acct_seller1",
  amount: 10000, amount_reversed: 0, currency: "gbp", livemode: false,
};
const fee = {
  id: "fee_market1", charge: "ch_market1", account: "acct_seller1",
  amount: 200, amount_refunded: 0, currency: "gbp", livemode: false,
};

function stripe() {
  return {
    charges: { retrieve: vi.fn(async () => charge) },
    transfers: { retrieve: vi.fn(async () => transfer) },
    applicationFees: { retrieve: vi.fn(async () => fee) },
    paymentIntents: { retrieve: vi.fn(async () => paymentIntent) },
  };
}

describe("Marketplace Stripe settlement evidence", () => {
  it("resolves a destination charge into its PaymentIntent, transfer and application fee", async () => {
    const api = stripe();
    const provider = await resolveMarketplaceSettlementProviderObjects(
      "charge.succeeded", charge, api,
    );
    expect(provider).toEqual({ charge, transfer, applicationFee: fee, paymentIntent });
    expect(api.paymentIntents.retrieve).toHaveBeenCalledWith("pi_market1");
    expect(api.transfers.retrieve).toHaveBeenCalledWith("tr_market1");
    expect(api.applicationFees.retrieve).toHaveBeenCalledWith("fee_market1");
  });

  it("resolves out-of-order transfer and fee webhooks back through the source charge", async () => {
    const transferApi = stripe();
    const fromTransfer = await resolveMarketplaceSettlementProviderObjects(
      "transfer.reversed", { ...transfer, amount_reversed: 2500 }, transferApi,
    );
    expect(fromTransfer?.charge.id).toBe("ch_market1");
    expect(fromTransfer?.transfer.amount_reversed).toBe(2500);
    expect(transferApi.charges.retrieve).toHaveBeenCalledWith("ch_market1");

    const feeApi = stripe();
    const fromFee = await resolveMarketplaceSettlementProviderObjects(
      "application_fee.refunded", { ...fee, amount_refunded: 100 }, feeApi,
    );
    expect(fromFee?.charge.id).toBe("ch_market1");
    expect(fromFee?.applicationFee.amount_refunded).toBe(100);
    expect(feeApi.charges.retrieve).toHaveBeenCalledWith("ch_market1");
  });

  it("ignores transfers that are not funded by a charge", async () => {
    const api = stripe();
    await expect(resolveMarketplaceSettlementProviderObjects(
      "transfer.created", { ...transfer, source_transaction: null }, api,
    )).resolves.toBeNull();
    expect(api.charges.retrieve).not.toHaveBeenCalled();
  });

  it("builds exact provider evidence for the authorised order and seller account", () => {
    const evidence = buildMarketplaceSettlementEvidence(
      { id: "evt_settle1", type: "charge.succeeded", created: 1790430000 },
      { charge, transfer, applicationFee: fee, paymentIntent },
      order, "acct_seller1", "sandbox",
    );
    expect(evidence).toMatchObject({
      p_event_id: "evt_settle1",
      p_order_id: order.id,
      p_seller_id: order.seller_id,
      p_payment_intent_id: "pi_market1",
      p_charge_id: "ch_market1",
      p_connected_account_id: "acct_seller1",
      p_charge_pence: 10000,
      p_transfer_id: "tr_market1",
      p_transfer_pence: 10000,
      p_transfer_reversed_pence: 0,
      p_application_fee_id: "fee_market1",
      p_application_fee_pence: 200,
      p_application_fee_refunded_pence: 0,
      p_currency: "GBP",
      p_livemode: false,
    });
  });

  it("retains partial transfer reversal and application-fee refund amounts without calling them payouts", () => {
    const evidence = buildMarketplaceSettlementEvidence(
      { id: "evt_settle2", type: "transfer.reversed", created: 1790430100 },
      {
        charge,
        transfer: { ...transfer, amount_reversed: 2500, reversed: false },
        applicationFee: { ...fee, amount_refunded: 50, refunded: false },
        paymentIntent,
      },
      order, "acct_seller1", "sandbox",
    );
    expect(evidence.p_transfer_reversed_pence).toBe(2500);
    expect(evidence.p_application_fee_refunded_pence).toBe(50);
  });

  it("rejects mismatched destination, amount, fee, environment or PaymentIntent metadata", () => {
    const event = { id: "evt_bad1", type: "charge.succeeded", created: 1790430000 };
    const base = { charge, transfer, applicationFee: fee, paymentIntent };
    for (const provider of [
      { ...base, charge: { ...charge, amount: 9999 } },
      { ...base, charge: { ...charge, transfer_data: { destination: "acct_other" } } },
      { ...base, transfer: { ...transfer, amount: 9999 } },
      { ...base, applicationFee: { ...fee, amount: 201 } },
      { ...base, paymentIntent: { ...paymentIntent, metadata: { ...paymentIntent.metadata, order_id: "33333333-3333-4333-8333-333333333333" } } },
    ]) {
      expect(() => buildMarketplaceSettlementEvidence(
        event, provider, order, "acct_seller1", "sandbox",
      )).toThrow();
    }
    expect(() => buildMarketplaceSettlementEvidence(
      event, base, order, "acct_seller1", "live",
    )).toThrow();
  });

  it("stores Marketplace identity on the PaymentIntent before any provider settlement webhook", () => {
    const checkout = readFileSync(new URL("./marketplace-checkout.functions.ts", import.meta.url), "utf8");
    expect(checkout).toContain("payment_intent_data:{");
    expect(checkout).toContain("kind:'marketplace_purchase',order_id:order.id,listing_id:l.id");
    expect(checkout).toContain("buyer_id:context.userId,seller_id:l.seller_id");
  });

  it("keeps settlement writes service-role-only and can establish a pending order PaymentIntent exactly once", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/20260926145500_marketplace_transfer_settlement_ledger.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("create table if not exists public.marketplace_order_settlements");
    expect(sql).toContain("create table if not exists public.marketplace_settlement_events");
    expect(sql).toContain("revoke all on public.marketplace_order_settlements,public.marketplace_settlement_events");
    expect(sql).toContain("grant select on public.marketplace_order_settlements,public.marketplace_settlement_events");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("create or replace function public.blackstar_reconcile_marketplace_settlement");
    expect(sql).toContain("v_order.status<>'pending'");
    expect(sql).toContain("set stripe_payment_intent_id=p_payment_intent_id");
    expect(sql).toContain("where id=p_order_id and stripe_payment_intent_id is null and status='pending'");
    expect(sql).toContain("greatest(v_row.transfer_reversed_pence");
    expect(sql).toContain("greatest(v_row.application_fee_refunded_pence");
  });

  it("routes all relevant Stripe snapshot events through settlement reconciliation", () => {
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    for (const type of [
      'case "charge.succeeded":',
      'case "transfer.created":',
      'case "transfer.updated":',
      'case "transfer.reversed":',
      'case "application_fee.created":',
      'case "application_fee.refunded":',
    ]) expect(route).toContain(type);
    expect(route).toContain("resolveMarketplaceSettlementProviderObjects");
    expect(route).toContain("buildMarketplaceSettlementEvidence");
    expect(route).toContain('"blackstar_reconcile_marketplace_settlement"');
    expect(route).toContain("Marketplace settlement PaymentIntent has no recorded order.");
  });
});
