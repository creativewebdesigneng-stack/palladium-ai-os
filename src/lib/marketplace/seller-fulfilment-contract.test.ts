import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Marketplace seller fulfilment contract", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20260925232500_marketplace_verified_seller_fulfilment.sql", import.meta.url),
    "utf8",
  );
  const functions = readFileSync(
    new URL("./marketplace-order-fulfilment.functions.ts", import.meta.url),
    "utf8",
  );
  const screen = readFileSync(
    new URL("../../screens/CreatorMarketplace.jsx", import.meta.url),
    "utf8",
  );

  it("executes delivery and order completion atomically behind seller identity", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("v_user_id uuid := (select auth.uid())");
    expect(sql).toContain("where id=p_order_id and seller_id=v_user_id");
    expect(sql).toContain("for update;");
    expect(sql).toContain("update public.marketplace_deliveries");
    expect(sql).toContain("update public.marketplace_orders");
    expect(sql.indexOf("update public.marketplace_deliveries"))
      .toBeLessThan(sql.indexOf("update public.marketplace_orders"));
  });

  it("requires verified paid Stripe evidence and blocks refunded orders", () => {
    expect(sql).toContain("v_order.status<>'paid'");
    expect(sql).toContain("v_order.paid_at is null");
    expect(sql).toContain("v_order.payment_provider is distinct from 'stripe'");
    expect(sql).toContain("v_order.stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'");
    expect(sql).toContain("coalesce(v_order.refunded_pence,0)>0");
    expect(sql).toContain("coalesce(v_order.refund_state,'none')<>'none'");
    expect(sql).toContain("delivery evidence required");
  });

  it("keeps settlement tables closed and exposes only the narrow authenticated RPC", () => {
    expect(sql).toContain("revoke all on function public.marketplace_fulfil_paid_order(uuid,text,text)");
    expect(sql).toContain("from public, anon;");
    expect(sql).toContain("to authenticated, service_role;");
    expect(sql).not.toMatch(/grant\s+update\s+on\s+public\.marketplace_(orders|deliveries)\s+to\s+authenticated/i);
  });

  it("uses authenticated server functions and verifies the returned fulfilment evidence", () => {
    expect(functions).toContain(".middleware([requireSupabaseAuth])");
    expect(functions).toContain('.eq("seller_id", context.userId)');
    expect(functions).toContain('sb.rpc("marketplace_fulfil_paid_order"');
    expect(functions).toContain('row.order_status !== "fulfilled"');
    expect(functions).toContain('row.delivery_status !== "delivered"');
    expect(functions).toContain("!row.delivered_at");
  });

  it("surfaces seller fulfilment in the Creator Marketplace instead of auto-delivery on payment", () => {
    expect(screen).toContain("MarketplaceFulfilmentCentre");
    expect(screen).toContain("<MarketplaceFulfilmentCentre/>");
    const webhook = readFileSync(
      new URL("../../routes/api/public/payments/webhook.ts", import.meta.url),
      "utf8",
    );
    const purchase = webhook.slice(webhook.indexOf('if (session.metadata?.kind === "marketplace_purchase")'));
    expect(purchase).toContain('status: "paid"');
    expect(purchase).not.toContain('status: "delivered"');
  });
});
