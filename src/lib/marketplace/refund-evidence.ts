/**
 * A Stripe charge.refunded event may represent a PARTIAL refund. A paid order
 * is never fully refunded merely because Stripe reports some refunded amount.
 * Confirm its original charge matches the persisted order amount and currency
 * before applying an irreversible customer-visible status change.
 *
 * This does not settle disputes, reverse a delivery, or certify seller payout
 * reconciliation; those are separate Marketplace financial lifecycle steps.
 */
export function verifyMarketplaceChargeRefund(
  charge: {
    payment_intent?: string | null;
    amount?: number | null;
    amount_refunded?: number | null;
    currency?: string | null;
    refunded?: boolean;
    livemode?: boolean;
  },
  order: { sale_price_pence: number; currency: string },
  environment: "sandbox" | "live",
): "full" | "partial" {
  if (typeof charge.payment_intent !== "string" || !charge.payment_intent.startsWith("pi_") ||
    !Number.isSafeInteger(order.sale_price_pence) || order.sale_price_pence <= 0 ||
    !Number.isSafeInteger(charge.amount) || charge.amount !== order.sale_price_pence ||
    !Number.isSafeInteger(charge.amount_refunded) ||
    (charge.amount_refunded as number) <= 0 ||
    (charge.amount_refunded as number) > (charge.amount as number) ||
    order.currency !== "GBP" ||
    charge.currency?.toLowerCase() !== order.currency.toLowerCase() ||
    charge.livemode !== (environment === "live")) {
    throw new Error("Charge refund does not match the authorised Marketplace order.");
  }
  if (charge.amount_refunded === charge.amount) {
    if (charge.refunded !== true) {
      throw new Error("Stripe charge has not confirmed a full refund.");
    }
    return "full";
  }
  if (charge.refunded === true) {
    throw new Error("Stripe charge refund status conflicts with refunded amount.");
  }
  return "partial";
}
