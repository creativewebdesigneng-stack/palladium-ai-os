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


export function stripeProviderEventCreatedAt(created: unknown): string {
  if (!Number.isSafeInteger(created) || Number(created) <= 0) {
    throw new Error("Stripe dispute event has no authoritative creation timestamp.");
  }
  return new Date(Number(created) * 1000).toISOString();
}

export function buildMarketplaceProviderDisputeRows(
  event: { id?: unknown; created?: unknown },
  dispute: {
    id?: unknown;
    charge?: unknown;
    payment_intent?: unknown;
    amount?: unknown;
    currency?: unknown;
    livemode?: unknown;
    status?: unknown;
    reason?: unknown;
  },
  order: { id: string; currency: string },
  environment: "sandbox" | "live",
  verified: {
    status: StripeDisputeStatus;
    evidenceDueAt: string | null;
  },
  preDisputeStatus: "paid" | "fulfilled" | null,
) {
  if (typeof event.id !== "string" || !/^evt_[A-Za-z0-9]+$/.test(event.id) ||
      typeof dispute.id !== "string" || !dispute.id.startsWith("du_") ||
      typeof dispute.charge !== "string" || !dispute.charge.startsWith("ch_") ||
      typeof dispute.payment_intent !== "string" || !dispute.payment_intent.startsWith("pi_") ||
      !Number.isSafeInteger(dispute.amount) || Number(dispute.amount) <= 0) {
    throw new Error("Provider dispute event lacks authoritative Stripe identifiers.");
  }
  const eventCreatedAt = stripeProviderEventCreatedAt(event.created);
  const reason =
    typeof dispute.reason === "string" && dispute.reason.trim()
      ? dispute.reason.trim().slice(0, 128)
      : null;
  const current = {
    order_id: order.id,
    stripe_dispute_id: dispute.id,
    stripe_charge_id: dispute.charge,
    stripe_payment_intent_id: dispute.payment_intent,
    disputed_pence: dispute.amount,
    currency: order.currency,
    provider_status: verified.status,
    reason,
    evidence_due_at: verified.evidenceDueAt,
    pre_dispute_status: preDisputeStatus,
    livemode: environment === "live",
    last_event_id: event.id,
    last_event_created_at: eventCreatedAt,
    updated_at: new Date().toISOString(),
  };
  const audit = {
    order_id: order.id,
    stripe_dispute_id: dispute.id,
    stripe_event_id: event.id,
    stripe_event_created_at: eventCreatedAt,
    provider_status: verified.status,
    disputed_pence: dispute.amount,
    currency: order.currency,
    livemode: environment === "live",
  };
  return { current, audit, eventCreatedAt };
}

export function compareProviderDisputeChronology(
  incomingEventCreatedAt: string,
  existing?: { last_event_created_at?: string | null; last_event_id?: string | null } | null,
): "newer" | "same" | "stale" {
  if (!existing?.last_event_created_at) return "newer";
  const incoming = Date.parse(incomingEventCreatedAt);
  const current = Date.parse(existing.last_event_created_at);
  if (!Number.isFinite(incoming) || !Number.isFinite(current)) {
    throw new Error("Provider dispute ledger contains invalid event chronology.");
  }
  if (incoming > current) return "newer";
  if (incoming < current) return "stale";
  return "same";
}


type StripeLikeId = string | { id?: string | null } | null | undefined;
function stripeObjectId(value: StripeLikeId): string | null {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && typeof value.id === "string" ? value.id : null;
}

export async function resolveMarketplaceDisputeProviderIds(
  dispute: { id?: unknown; charge?: StripeLikeId; payment_intent?: StripeLikeId },
  retrieveCharge: (chargeId: string) => Promise<{ payment_intent?: StripeLikeId }>,
): Promise<{ disputeId: string; chargeId: string; paymentIntentId: string }> {
  if (typeof dispute.id !== "string" || !/^du_[A-Za-z0-9]+$/.test(dispute.id)) {
    throw new Error("Stripe dispute has no authoritative dispute ID.");
  }
  const chargeId = stripeObjectId(dispute.charge);
  if (!chargeId || !/^ch_[A-Za-z0-9]+$/.test(chargeId)) {
    throw new Error("Stripe dispute has no authoritative charge ID.");
  }
  let paymentIntentId = stripeObjectId(dispute.payment_intent);
  if (!paymentIntentId) {
    const charge = await retrieveCharge(chargeId);
    paymentIntentId = stripeObjectId(charge.payment_intent);
  }
  if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    throw new Error("Stripe dispute could not be linked to a PaymentIntent.");
  }
  return { disputeId: dispute.id, chargeId, paymentIntentId };
}
