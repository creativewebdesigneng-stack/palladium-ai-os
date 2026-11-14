/**
 * Subscription charge signals that are not Marketplace orders.
 * Recording is an audit of a signed Stripe event. It does not refund, email,
 * or change a plan by itself — subscription state still comes from
 * customer.subscription.* webhooks.
 */

export type SubscriptionChargeSignal =
  | { record: false; reason: "marketplace" | "no-customer" | "bad-amount" }
  | {
      record: true;
      metric: "billing.subscription_refunded";
      customerId: string;
      quantity: number;
      unit: "gbp";
    };

function customerIdOf(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("cus_")) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.startsWith("cus_")) return id;
  }
  return null;
}

export function subscriptionRefundSignal(
  charge: {
    customer?: unknown;
    amount_refunded?: unknown;
    currency?: unknown;
  },
  hasMarketplaceOrder: boolean,
): SubscriptionChargeSignal {
  if (hasMarketplaceOrder) return { record: false, reason: "marketplace" };
  const customerId = customerIdOf(charge.customer);
  if (!customerId) return { record: false, reason: "no-customer" };
  const amount = charge.amount_refunded;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
    return { record: false, reason: "bad-amount" };
  }
  if ((charge.currency ?? "gbp").toString().toLowerCase() !== "gbp") {
    return { record: false, reason: "bad-amount" };
  }
  return {
    record: true,
    metric: "billing.subscription_refunded",
    customerId,
    quantity: amount / 100,
    unit: "gbp",
  };
}

export function earlyFraudCustomer(
  charge: { customer?: unknown } | null | undefined,
): string | null {
  if (!charge) return null;
  return customerIdOf(charge.customer);
}
