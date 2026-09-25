import { verifyMarketplaceChargeRefund } from "./refund-evidence";

type RefundEnv = "sandbox" | "live";
type RefundCharge = {
  id?: string | null;
  payment_intent?: string | null;
  amount?: number | null;
  amount_refunded?: number | null;
  currency?: string | null;
  refunded?: boolean;
  livemode?: boolean;
};
type RefundOrder = {
  id: string;
  sale_price_pence: number;
  currency: string;
  status: string;
  refunded_pence?: number | null;
  refund_state?: string | null;
};

export type MarketplaceRefundPlan = {
  providerState: "partial" | "full";
  disposition: "advance" | "duplicate" | "stale";
  cumulativeRefundedPence: number;
  refundState: "partial" | "full";
  nextOrderStatus: string;
};

export function planMarketplaceRefundReconciliation(
  charge: RefundCharge,
  order: RefundOrder,
  environment: RefundEnv,
): MarketplaceRefundPlan {
  const providerState = verifyMarketplaceChargeRefund(charge, order, environment);
  const current = Number(order.refunded_pence ?? 0);
  if (!Number.isSafeInteger(current) || current < 0 || current > order.sale_price_pence) {
    throw new Error("Marketplace order has invalid persisted refund accounting.");
  }
  const next = charge.amount_refunded as number;
  if (!["paid", "fulfilled", "disputed", "cancelled", "refunded"].includes(order.status)) {
    throw new Error("Marketplace order cannot accept provider refund accounting in its current state.");
  }
  const refundState = next === order.sale_price_pence ? "full" : "partial";
  if (next < current) {
    return {
      providerState,
      disposition: "stale",
      cumulativeRefundedPence: current,
      refundState: current === order.sale_price_pence ? "full" : "partial",
      nextOrderStatus: order.status,
    };
  }
  if (next === current) {
    return {
      providerState,
      disposition: "duplicate",
      cumulativeRefundedPence: current,
      refundState: current === order.sale_price_pence ? "full" : refundState,
      nextOrderStatus: order.status,
    };
  }
  return {
    providerState,
    disposition: "advance",
    cumulativeRefundedPence: next,
    refundState,
    nextOrderStatus:
      refundState === "full" && ["paid", "fulfilled"].includes(order.status)
        ? "refunded"
        : order.status,
  };
}

export function buildMarketplaceRefundEventRow(
  stripeEventId: unknown,
  charge: RefundCharge,
  order: RefundOrder,
  environment: RefundEnv,
  plan: MarketplaceRefundPlan,
) {
  if (typeof stripeEventId !== "string" || !/^evt_[A-Za-z0-9]+$/.test(stripeEventId) ||
      typeof charge.id !== "string" || !charge.id.startsWith("ch_") ||
      typeof charge.payment_intent !== "string" || !charge.payment_intent.startsWith("pi_")) {
    throw new Error("Marketplace refund event lacks authoritative Stripe identifiers.");
  }
  return {
    order_id: order.id,
    stripe_event_id: stripeEventId,
    stripe_charge_id: charge.id,
    stripe_payment_intent_id: charge.payment_intent,
    cumulative_refunded_pence: charge.amount_refunded,
    currency: order.currency,
    refund_state: plan.providerState,
    livemode: environment === "live",
  };
}
