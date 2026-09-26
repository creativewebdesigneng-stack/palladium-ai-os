type StripeEnv = "sandbox" | "live";

function providerId(value: any, prefix: string): string | null {
  const id = typeof value === "string" ? value : value?.id;
  return typeof id === "string" && id.startsWith(prefix) ? id : null;
}

function requiredCreatedAt(value: unknown): string {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("Stripe settlement event has no authoritative creation timestamp.");
  }
  return new Date(Number(value) * 1000).toISOString();
}

export async function resolveMarketplaceSettlementProviderObjects(
  eventType: string,
  object: any,
  stripe: {
    charges: { retrieve: (id: string) => Promise<any> };
    transfers: { retrieve: (id: string) => Promise<any> };
    applicationFees: { retrieve: (id: string) => Promise<any> };
    paymentIntents: { retrieve: (id: string) => Promise<any> };
  },
): Promise<{ charge: any; transfer: any | null; applicationFee: any | null; paymentIntent: any } | null> {
  let charge: any = null;
  let transfer: any | null = null;
  let applicationFee: any | null = null;

  if (eventType === "charge.succeeded") {
    charge = object;
  } else if (eventType.startsWith("transfer.")) {
    transfer = object;
    const chargeId = providerId(object?.source_transaction, "ch_");
    if (!chargeId) return null;
    charge = await stripe.charges.retrieve(chargeId);
  } else if (eventType.startsWith("application_fee.")) {
    applicationFee = object;
    const chargeId = providerId(object?.charge ?? object?.fee_source?.charge, "ch_");
    if (!chargeId) return null;
    charge = await stripe.charges.retrieve(chargeId);
  } else {
    return null;
  }

  const paymentIntentId = providerId(charge?.payment_intent, "pi_");
  if (!paymentIntentId) return null;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!transfer) {
    const transferId = providerId(charge?.transfer, "tr_");
    if (transferId) transfer = await stripe.transfers.retrieve(transferId);
  }
  if (!applicationFee) {
    const feeId = providerId(charge?.application_fee, "fee_");
    if (feeId) applicationFee = await stripe.applicationFees.retrieve(feeId);
  }

  return { charge, transfer, applicationFee, paymentIntent };
}

export function buildMarketplaceSettlementEvidence(
  event: { id?: unknown; created?: unknown; type?: unknown },
  provider: { charge: any; transfer: any | null; applicationFee: any | null; paymentIntent: any },
  order: {
    id: string;
    seller_id: string;
    sale_price_pence: number;
    platform_fee_pence: number;
    currency: string;
    payment_provider: string | null;
    stripe_payment_intent_id: string | null;
  },
  connectedAccountId: string,
  environment: StripeEnv,
) {
  if (typeof event.id !== "string" || !/^evt_[A-Za-z0-9]+$/.test(event.id) ||
      typeof event.type !== "string" ||
      ![
        "charge.succeeded","transfer.created","transfer.updated","transfer.reversed",
        "application_fee.created","application_fee.refunded",
      ].includes(event.type)) {
    throw new Error("Marketplace settlement event identity is invalid.");
  }
  const charge = provider.charge;
  const paymentIntent = (provider as any).paymentIntent;
  const chargeId = providerId(charge?.id, "ch_");
  const paymentIntentId = providerId(charge?.payment_intent, "pi_");
  const retrievedPaymentIntentId = providerId(paymentIntent?.id, "pi_");
  const chargeDestination = providerId(charge?.transfer_data?.destination, "acct_");
  if (!chargeId || !paymentIntentId || retrievedPaymentIntentId !== paymentIntentId ||
      (order.stripe_payment_intent_id !== null && paymentIntentId !== order.stripe_payment_intent_id) ||
      paymentIntent?.metadata?.kind !== "marketplace_purchase" ||
      paymentIntent?.metadata?.order_id !== order.id ||
      paymentIntent?.metadata?.seller_id !== order.seller_id ||
      !Number.isSafeInteger(paymentIntent?.amount) || paymentIntent.amount !== order.sale_price_pence ||
      paymentIntent?.currency?.toUpperCase() !== "GBP" ||
      paymentIntent?.livemode !== (environment === "live") ||
      order.payment_provider !== "stripe" ||
      !Number.isSafeInteger(order.sale_price_pence) || order.sale_price_pence <= 0 ||
      !Number.isSafeInteger(order.platform_fee_pence) || order.platform_fee_pence < 0 ||
      !Number.isSafeInteger(charge?.amount) || charge.amount !== order.sale_price_pence ||
      charge?.currency?.toUpperCase() !== "GBP" || order.currency !== "GBP" ||
      charge?.livemode !== (environment === "live") ||
      charge?.paid !== true || charge?.status !== "succeeded" ||
      !connectedAccountId.startsWith("acct_") ||
      chargeDestination !== connectedAccountId) {
    throw new Error("Stripe charge does not match the authorised Marketplace destination charge.");
  }
  if (Number.isSafeInteger(charge?.application_fee_amount) &&
      charge.application_fee_amount !== order.platform_fee_pence) {
    throw new Error("Stripe charge application fee does not match the Marketplace fee quote.");
  }

  const transfer = provider.transfer;
  let transferId: string | null = null;
  let transferPence: number | null = null;
  let transferReversedPence = 0;
  if (transfer) {
    transferId = providerId(transfer.id, "tr_");
    const destination = providerId(transfer.destination, "acct_");
    const sourceCharge = providerId(transfer.source_transaction, "ch_");
    if (!transferId || destination !== connectedAccountId ||
        sourceCharge !== chargeId ||
        !Number.isSafeInteger(transfer.amount) || transfer.amount !== order.sale_price_pence ||
        !Number.isSafeInteger(transfer.amount_reversed) || transfer.amount_reversed < 0 ||
        transfer.amount_reversed > transfer.amount ||
        transfer.currency?.toUpperCase() !== "GBP" ||
        transfer.livemode !== (environment === "live")) {
      throw new Error("Stripe transfer does not match the authorised Marketplace destination charge.");
    }
    transferPence = transfer.amount;
    transferReversedPence = transfer.amount_reversed;
  }

  const fee = provider.applicationFee;
  let applicationFeeId: string | null = null;
  let applicationFeePence: number | null =
    Number.isSafeInteger(charge?.application_fee_amount)
      ? charge.application_fee_amount
      : null;
  let applicationFeeRefundedPence = 0;
  if (fee) {
    applicationFeeId = providerId(fee.id, "fee_");
    const feeCharge = providerId(fee.charge ?? fee.fee_source?.charge, "ch_");
    const feeAccount = providerId(fee.account, "acct_");
    if (!applicationFeeId || feeCharge !== chargeId || feeAccount !== connectedAccountId ||
        !Number.isSafeInteger(fee.amount) || fee.amount !== order.platform_fee_pence ||
        !Number.isSafeInteger(fee.amount_refunded) || fee.amount_refunded < 0 ||
        fee.amount_refunded > fee.amount ||
        fee.currency?.toUpperCase() !== "GBP" ||
        fee.livemode !== (environment === "live")) {
      throw new Error("Stripe application fee does not match the authorised Marketplace fee.");
    }
    applicationFeePence = fee.amount;
    applicationFeeRefundedPence = fee.amount_refunded;
  }

  return {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created_at: requiredCreatedAt(event.created),
    p_order_id: order.id,
    p_seller_id: order.seller_id,
    p_payment_intent_id: paymentIntentId,
    p_charge_id: chargeId,
    p_connected_account_id: connectedAccountId,
    p_charge_pence: charge.amount,
    p_transfer_id: transferId,
    p_transfer_pence: transferPence,
    p_transfer_reversed_pence: transferReversedPence,
    p_application_fee_id: applicationFeeId,
    p_application_fee_pence: applicationFeePence,
    p_application_fee_refunded_pence: applicationFeeRefundedPence,
    p_currency: "GBP",
    p_livemode: environment === "live",
  };
}
