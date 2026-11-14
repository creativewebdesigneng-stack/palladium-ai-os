/**
 * Commercial report built only from already-recorded rows.
 * Amounts are integer pence. Stripe transfer totals are settlement between
 * Stripe accounts, not confirmation that a seller's bank payout completed.
 */
import { planForPriceKey, pricePenceForPlan, type PlanCode } from "./catalog";

const RECOGNISED = new Set(["active", "trialing"]);

export type CommercialSubscriptionRow = {
  plan_code?: string | null;
  status?: string | null;
  stripe_price_id?: string | null;
};

export type CommercialOrderRow = {
  status?: string | null;
  sale_price_pence?: number | null;
  platform_fee_pence?: number | null;
  seller_net_pence?: number | null;
  refunded_pence?: number | null;
  currency?: string | null;
};

export type CommercialSettlementRow = {
  transfer_pence?: number | null;
  transfer_reversed_pence?: number | null;
  application_fee_pence?: number | null;
  application_fee_refunded_pence?: number | null;
  currency?: string | null;
};

function pence(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0) return 0;
  return amount;
}

/** Monthly recurring pence for a recorded subscription. Explorer and unknown plans are zero. */
export function monthlyRecurringPence(row: CommercialSubscriptionRow): number {
  const priceKey = typeof row.stripe_price_id === "string" ? row.stripe_price_id : null;
  const fromKey = priceKey ? planForPriceKey(priceKey) : null;
  const plan = (fromKey ?? row.plan_code) as PlanCode | string | null;
  if (plan !== "builder" && plan !== "business" && plan !== "enterprise") return 0;
  if (
    priceKey === "builder_yearly_1530_gbp" ||
    priceKey === "business_yearly_15300_gbp" ||
    priceKey === "enterprise_yearly_35700_gbp"
  ) {
    const yearly = pricePenceForPlan(plan, "yearly");
    return yearly == null ? 0 : Math.round(yearly / 12);
  }
  return pricePenceForPlan(plan, "monthly") ?? 0;
}

export function buildCommercialReport(input: {
  subscriptions?: CommercialSubscriptionRow[] | null;
  orders?: CommercialOrderRow[] | null;
  settlements?: CommercialSettlementRow[] | null;
  capped?: boolean;
}) {
  const subscriptions = input.subscriptions ?? [];
  let recognisedMonthlyPence = 0;
  let pastDueMonthlyPence = 0;
  let activePaid = 0;
  let pastDue = 0;
  let legacyExplorer = 0;

  for (const row of subscriptions) {
    const status = row.status ?? "";
    const monthly = monthlyRecurringPence(row);
    const plan = planForPriceKey(row.stripe_price_id) ?? row.plan_code;
    if (plan === "explorer") legacyExplorer += 1;
    if (RECOGNISED.has(status) && monthly > 0) {
      activePaid += 1;
      recognisedMonthlyPence += monthly;
    } else if (status === "past_due" && monthly > 0) {
      pastDue += 1;
      pastDueMonthlyPence += monthly;
    }
  }

  let grossSalePence = 0;
  let refundedPence = 0;
  let platformFeePence = 0;
  let sellerNetPence = 0;
  let countedOrders = 0;
  for (const order of input.orders ?? []) {
    if ((order.currency ?? "GBP").toUpperCase() !== "GBP") continue;
    if (!["paid", "fulfilled", "refunded", "disputed"].includes(order.status ?? "")) continue;
    const sale = pence(order.sale_price_pence);
    const refunded = Math.min(pence(order.refunded_pence), sale);
    countedOrders += 1;
    grossSalePence += sale;
    refundedPence += refunded;
    platformFeePence += pence(order.platform_fee_pence);
    sellerNetPence += pence(order.seller_net_pence);
  }

  let transferNetPence = 0;
  let applicationFeeNetPence = 0;
  let countedSettlements = 0;
  for (const settlement of input.settlements ?? []) {
    if ((settlement.currency ?? "GBP").toUpperCase() !== "GBP") continue;
    const transfer = pence(settlement.transfer_pence);
    const reversed = Math.min(pence(settlement.transfer_reversed_pence), transfer);
    const fee = pence(settlement.application_fee_pence);
    const feeRefunded = Math.min(pence(settlement.application_fee_refunded_pence), fee);
    countedSettlements += 1;
    transferNetPence += transfer - reversed;
    applicationFeeNetPence += fee - feeRefunded;
  }

  return {
    currency: "GBP" as const,
    capped: Boolean(input.capped),
    subscriptions: {
      activePaid,
      pastDue,
      legacyExplorer,
      recognisedMonthlyPence,
      pastDueMonthlyPence,
    },
    marketplace: {
      orderCount: countedOrders,
      grossSalePence,
      refundedPence,
      netSalePence: grossSalePence - refundedPence,
      platformFeePence,
      sellerNetPence,
    },
    payouts: {
      settlementCount: countedSettlements,
      transferNetPence,
      applicationFeeNetPence,
      bankPayoutConfirmed: false as const,
      note: "Stripe transfer settlement is not a completed bank payout.",
    },
  };
}
