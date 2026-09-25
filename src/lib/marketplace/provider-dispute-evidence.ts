export const STRIPE_MARKETPLACE_DISPUTE_STATUSES = [
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "needs_response",
  "under_review",
  "won",
  "lost",
  "prevented",
] as const;

type StripeDisputeStatus = (typeof STRIPE_MARKETPLACE_DISPUTE_STATUSES)[number];
type StripeLikeId = string | { id?: string | null } | null | undefined;

function idOf(value: StripeLikeId): string | null {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && typeof value.id === "string" ? value.id : null;
}

export async function resolveMarketplaceDisputeProviderIds(
  dispute: { id?: string; charge?: StripeLikeId; payment_intent?: StripeLikeId },
  retrieveCharge: (chargeId: string) => Promise<{ payment_intent?: StripeLikeId }>,
) {
  if (typeof dispute.id !== "string" || !/^(du|dp)_[A-Za-z0-9]+$/.test(dispute.id)) {
    throw new Error("Stripe dispute has no authoritative dispute ID.");
  }
  const chargeId = idOf(dispute.charge);
  if (!chargeId || !/^ch_[A-Za-z0-9]+$/.test(chargeId)) {
    throw new Error("Stripe dispute has no authoritative charge ID.");
  }
  let paymentIntentId = idOf(dispute.payment_intent);
  if (!paymentIntentId) {
    const charge = await retrieveCharge(chargeId);
    paymentIntentId = idOf(charge.payment_intent);
  }
  if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    throw new Error("Stripe dispute could not be linked to a PaymentIntent.");
  }
  return { disputeId: dispute.id, chargeId, paymentIntentId };
}

export function verifyMarketplaceProviderDispute(
  dispute: {
    amount?: number | null;
    currency?: string | null;
    livemode?: boolean;
    status?: string | null;
    reason?: string | null;
    evidence_details?: { due_by?: number | null } | null;
    created?: number | null;
  },
  order: { sale_price_pence: number; currency: string },
  environment: "sandbox" | "live",
) {
  if (!Number.isSafeInteger(order.sale_price_pence) || order.sale_price_pence <= 0 ||
      !Number.isSafeInteger(dispute.amount) || (dispute.amount as number) <= 0 ||
      (dispute.amount as number) > order.sale_price_pence ||
      order.currency !== "GBP" ||
      dispute.currency?.toLowerCase() !== order.currency.toLowerCase() ||
      dispute.livemode !== (environment === "live") ||
      !STRIPE_MARKETPLACE_DISPUTE_STATUSES.includes(dispute.status as StripeDisputeStatus)) {
    throw new Error("Stripe dispute does not match the authorised Marketplace order.");
  }
  const secondsToIso = (value: number | null | undefined) =>
    Number.isSafeInteger(value) && (value as number) > 0
      ? new Date((value as number) * 1000).toISOString()
      : null;
  return {
    amountPence: dispute.amount as number,
    currency: "GBP",
    status: dispute.status as StripeDisputeStatus,
    reason: typeof dispute.reason === "string" ? dispute.reason.slice(0, 120) : null,
    evidenceDueAt: secondsToIso(dispute.evidence_details?.due_by),
    providerCreatedAt: secondsToIso(dispute.created),
    livemode: environment === "live",
  };
}
