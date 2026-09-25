export type StripeDisputeStatus =
  | "warning_needs_response"
  | "warning_under_review"
  | "warning_closed"
  | "needs_response"
  | "under_review"
  | "won"
  | "lost"
  | "prevented";

export type MarketplaceProviderDisputeOutcome = "active" | "won" | "lost";

const ACTIVE = new Set<StripeDisputeStatus>([
  "warning_needs_response", "warning_under_review", "needs_response", "under_review",
]);
const RESOLVED_FAVOURABLE = new Set<StripeDisputeStatus>([
  "warning_closed", "won", "prevented",
]);

export function verifyMarketplaceProviderDispute(
  dispute: {
    id?: unknown;
    charge?: unknown;
    payment_intent?: unknown;
    amount?: unknown;
    currency?: unknown;
    livemode?: unknown;
    status?: unknown;
    reason?: unknown;
    evidence_details?: { due_by?: unknown } | null;
  },
  order: {
    stripe_payment_intent_id: string | null;
    sale_price_pence: number;
    currency: string;
    payment_provider: string | null;
  },
  environment: "sandbox" | "live",
): {
  outcome: MarketplaceProviderDisputeOutcome;
  status: StripeDisputeStatus;
  evidenceDueAt: string | null;
} {
  if (typeof dispute.id !== "string" || !dispute.id.startsWith("du_") ||
      typeof dispute.charge !== "string" || !dispute.charge.startsWith("ch_") ||
      typeof dispute.payment_intent !== "string" || !dispute.payment_intent.startsWith("pi_") ||
      dispute.payment_intent !== order.stripe_payment_intent_id ||
      order.payment_provider !== "stripe" ||
      !Number.isSafeInteger(order.sale_price_pence) || order.sale_price_pence <= 0 ||
      !Number.isSafeInteger(dispute.amount) || (dispute.amount as number) <= 0 ||
      (dispute.amount as number) > order.sale_price_pence ||
      order.currency !== "GBP" ||
      typeof dispute.currency !== "string" ||
      dispute.currency.toLowerCase() !== order.currency.toLowerCase() ||
      dispute.livemode !== (environment === "live") ||
      typeof dispute.status !== "string" ||
      ![...ACTIVE, ...RESOLVED_FAVOURABLE, "lost"].includes(dispute.status as StripeDisputeStatus)) {
    throw new Error("Stripe dispute does not match the authorised Marketplace order.");
  }

  const status = dispute.status as StripeDisputeStatus;
  let outcome: MarketplaceProviderDisputeOutcome;
  if (ACTIVE.has(status)) outcome = "active";
  else if (RESOLVED_FAVOURABLE.has(status)) outcome = "won";
  else outcome = "lost";

  const due = dispute.evidence_details?.due_by;
  const evidenceDueAt =
    Number.isSafeInteger(due) && Number(due) > 0
      ? new Date(Number(due) * 1000).toISOString()
      : null;

  return { outcome, status, evidenceDueAt };
}

export function resolveMarketplacePreDisputeStatus(
  order: { status: string; paid_at?: string | null; fulfilled_at?: string | null },
  existing?: { pre_dispute_status?: string | null } | null,
): "paid" | "fulfilled" | null {
  if (existing?.pre_dispute_status === "paid" || existing?.pre_dispute_status === "fulfilled") {
    return existing.pre_dispute_status;
  }
  if (order.status === "paid" || order.status === "fulfilled") return order.status;
  if (order.fulfilled_at) return "fulfilled";
  if (order.paid_at) return "paid";
  return null;
}

export function planMarketplaceProviderDisputeOrderState(
  outcome: MarketplaceProviderDisputeOutcome,
  order: { status: string; refund_state?: string | null },
  preDisputeStatus: "paid" | "fulfilled" | null,
): string {
  if (outcome === "active") {
    if (["paid", "fulfilled", "disputed"].includes(order.status)) return "disputed";
    if (["refunded", "charged_back"].includes(order.status)) return order.status;
    throw new Error("Marketplace order cannot enter provider dispute from its current state.");
  }

  if (outcome === "lost") {
    if (order.refund_state === "full" || order.status === "refunded") return "refunded";
    if (["paid", "fulfilled", "disputed", "charged_back"].includes(order.status)) return "charged_back";
    throw new Error("Marketplace order cannot record a lost provider dispute from its current state.");
  }

  if (order.refund_state === "full" || order.status === "refunded") return "refunded";
  if (order.status === "charged_back") return "charged_back";
  if (order.status === "disputed") {
    if (!preDisputeStatus) {
      throw new Error("Provider dispute cannot restore an order without a verified pre-dispute state.");
    }
    return preDisputeStatus;
  }
  if (order.status === "paid" || order.status === "fulfilled") return order.status;
  throw new Error("Marketplace order cannot close provider dispute from its current state.");
}
