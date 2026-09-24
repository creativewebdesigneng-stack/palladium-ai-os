import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { verifyMarketplaceChargeRefund } from "./refund-evidence";

const order = { sale_price_pence: 12800, currency: "GBP" };
const charge = {
  payment_intent: "pi_owned_order", amount: 12800, amount_refunded: 12800,
  refunded: true, currency: "gbp", livemode: false,
};

describe("Marketplace full-refund evidence", () => {
  it("records full refunds only for the exact original GBP charge and environment", () => {
    expect(verifyMarketplaceChargeRefund(charge, order, "sandbox")).toBe("full");
    expect(verifyMarketplaceChargeRefund({ ...charge, livemode: true }, order, "live")).toBe("full");
    for (const changed of [
      { amount: 12801 }, { amount_refunded: 0 }, { amount_refunded: 12801 },
      { amount_refunded: null }, { currency: "usd" }, { livemode: true },
      { refunded: false }, { payment_intent: "not-an-intent" },
    ]) expect(() => verifyMarketplaceChargeRefund({ ...charge, ...changed }, order, "sandbox")).toThrow();
    expect(() => verifyMarketplaceChargeRefund(charge, { ...order, sale_price_pence: 13000 }, "sandbox")).toThrow();
  });

  it("classifies a genuine partial refund without claiming the entire order is refunded", () => {
    expect(verifyMarketplaceChargeRefund(
      { ...charge, amount_refunded: 500, refunded: false }, order, "sandbox",
    )).toBe("partial");
    expect(() => verifyMarketplaceChargeRefund(
      { ...charge, amount_refunded: 500, refunded: true }, order, "sandbox",
    )).toThrow("conflicts");
  });

  it("reads the authorised order, preserves dispute states and never changes status for a partial refund", () => {
    const route = readFileSync(new URL("../../routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
    const refund = route.slice(route.indexOf('case "charge.refunded"'), route.indexOf("    default:", route.indexOf('case "charge.refunded"')));
    expect(refund).toContain('.eq("stripe_payment_intent_id", paymentIntentId)');
    expect(refund).toContain('verifyMarketplaceChargeRefund(charge, order, env)');
    expect(refund).toContain('if (refund === "partial")');
    expect(refund.indexOf('if (refund === "partial")')).toBeLessThan(refund.indexOf('.update({ status: "refunded" })'));
    expect(refund).toContain('if (order.status === "refunded") break;');
    expect(refund).toContain('if (!["paid", "fulfilled"].includes(order.status))');
    expect(refund).toContain('.in("status", ["paid", "fulfilled"])');
    expect(refund).toContain('if (refundError || !refunded) throw');
    expect(refund).not.toContain('status: "delivered"');
  });
});
