/**
 * Canonical PalladiumAI plan <-> Stripe price mapping.
 *
 * The backend NEVER accepts a Stripe price id from the frontend. Clients send
 * an internal plan code (`explorer` | `builder` | `business` | `enterprise`)
 * plus a billing interval, and this module resolves the approved Stripe price
 * lookup key and expected GBP amount. Anything unknown is rejected.
 *
 * Current paid pricing (GBP):
 *   Builder     £150/mo   | £1,530/yr
 *   Business    £1,500/mo | £15,300/yr
 *   Enterprise  £3,500/mo | £35,700/yr
 *
 * Price lookup keys include the amount so an old Stripe Price can never be
 * silently reused after a commercial pricing change. Old lookup keys remain
 * recognised below only so historic webhook/subscription records still map to
 * the correct internal plan.
 *
 * Explorer remains a recognised legacy code for existing records/webhooks but
 * is no longer publicly purchasable or an active product tier.
 */

export type PlanCode = "explorer" | "builder" | "business" | "enterprise";
export type BillingInterval = "monthly" | "yearly";

/** Legacy/UI aliases -> canonical plan codes. */
const PLAN_ALIASES: Record<string, PlanCode> = {
  free: "explorer",
  explorer: "explorer",
  pro: "builder",
  builder: "builder",
  business: "business",
  enterprise: "enterprise",
};

export const PLAN_PRICE_KEYS: Record<
  Exclude<PlanCode, "explorer">,
  Record<BillingInterval, string>
> = {
  builder: { monthly: "builder_monthly_150_gbp", yearly: "builder_yearly_1530_gbp" },
  business: { monthly: "business_monthly_1500_gbp", yearly: "business_yearly_15300_gbp" },
  enterprise: { monthly: "enterprise_monthly_3500_gbp", yearly: "enterprise_yearly_35700_gbp" },
};

/** Expected Stripe unit amounts, in GBP pence. */
export const PLAN_PRICE_PENCE: Record<
  Exclude<PlanCode, "explorer">,
  Record<BillingInterval, number>
> = {
  builder: { monthly: 15_000, yearly: 153_000 },
  business: { monthly: 150_000, yearly: 1_530_000 },
  enterprise: { monthly: 350_000, yearly: 3_570_000 },
};

/** Stripe price lookup key -> internal plan code (used by webhooks). */
export const PLAN_BY_PRICE_KEY: Record<string, PlanCode> = {
  builder_monthly_150_gbp: "builder",
  builder_yearly_1530_gbp: "builder",
  business_monthly_1500_gbp: "business",
  business_yearly_15300_gbp: "business",
  enterprise_monthly_3500_gbp: "enterprise",
  enterprise_yearly_35700_gbp: "enterprise",
  // Historic keys retained for existing subscription/webhook compatibility.
  pro_monthly: "builder",
  pro_yearly: "builder",
  business_monthly: "business",
  business_yearly: "business",
  enterprise_monthly: "enterprise",
  enterprise_yearly: "enterprise",
};

/**
 * Leftover free Explorer webhook keys. Do not delete these.
 *
 * Explorer is no longer sold. Older Stripe prices and Lovable external ids
 * still arrive on signed webhooks with these keys. They resolve only to
 * Explorer, never to a paid plan, and checkout refuses to sell them.
 */
export const LEGACY_FREE_EXPLORER_PRICE_KEYS: Record<string, "explorer"> = {
  explorer: "explorer",
  explorer_monthly: "explorer",
  explorer_yearly: "explorer",
  free: "explorer",
  free_monthly: "explorer",
  free_yearly: "explorer",
};

export function normalizePlanCode(value: unknown): PlanCode | null {
  if (typeof value !== "string") return null;
  return PLAN_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function normalizeInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

/** Returns the approved Stripe lookup key, or null for legacy Explorer / unknown plans. */
export function priceKeyForPlan(planCode: unknown, interval: unknown): string | null {
  const code = normalizePlanCode(planCode);
  if (!code || code === "explorer") return null;
  return PLAN_PRICE_KEYS[code][normalizeInterval(interval)];
}

/** Returns the expected Stripe amount in GBP pence, or null for Explorer / unknown plans. */
export function pricePenceForPlan(planCode: unknown, interval: unknown): number | null {
  const code = normalizePlanCode(planCode);
  if (!code || code === "explorer") return null;
  return PLAN_PRICE_PENCE[code][normalizeInterval(interval)];
}

export function planForPriceKey(priceKey: unknown): PlanCode | null {
  if (typeof priceKey !== "string") return null;
  const key = priceKey.trim();
  return PLAN_BY_PRICE_KEY[key] ?? LEGACY_FREE_EXPLORER_PRICE_KEYS[key] ?? null;
}

export function intervalForPriceKey(priceKey: string): BillingInterval | null {
  for (const keys of Object.values(PLAN_PRICE_KEYS)) {
    if (keys.monthly === priceKey) return "monthly";
    if (keys.yearly === priceKey) return "yearly";
  }
  return null;
}

export type WebhookPlanResolution =
  { ok: true; planCode: PlanCode; legacyFreeExplorer: boolean } | { ok: false; reason: string };

/**
 * Resolves a signed subscription webhook to an internal plan.
 *
 * A missing or unknown price is rejected. It is never promoted to Builder.
 * The retained free Explorer keys, and a zero-amount event whose metadata
 * still says Explorer, stay on Explorer.
 */
export function resolveSubscriptionWebhookPlan(input: {
  priceKey: unknown;
  unitAmount?: unknown;
  currency?: unknown;
  metadataPlan?: unknown;
}): WebhookPlanResolution {
  const priceKey =
    typeof input.priceKey === "string" && input.priceKey.trim() ? input.priceKey.trim() : null;
  const metadataPlan = normalizePlanCode(input.metadataPlan);
  const amount =
    input.unitAmount == null || input.unitAmount === ""
      ? null
      : typeof input.unitAmount === "number"
        ? input.unitAmount
        : Number.NaN;
  const currency = typeof input.currency === "string" ? input.currency.toLowerCase() : null;

  if (amount != null && !Number.isSafeInteger(amount)) {
    return { ok: false, reason: "Subscription price amount is not a valid pence integer." };
  }

  if (priceKey) {
    const mapped = planForPriceKey(priceKey);
    if (!mapped)
      return { ok: false, reason: "Subscription price is not an approved Blackstar plan." };
    if (mapped === "explorer") {
      if (amount != null && amount !== 0) {
        return { ok: false, reason: "Legacy Explorer price cannot carry a paid amount." };
      }
      if (currency && currency !== "gbp") {
        return { ok: false, reason: "Legacy Explorer price currency is not GBP." };
      }
      return { ok: true, planCode: "explorer", legacyFreeExplorer: true };
    }
    if (currency && currency !== "gbp") {
      return { ok: false, reason: "Subscription price currency is not GBP." };
    }
    const interval = intervalForPriceKey(priceKey);
    if (interval && amount != null && amount !== pricePenceForPlan(mapped, interval)) {
      return {
        ok: false,
        reason: "Subscription price amount does not match the approved catalog.",
      };
    }
    return { ok: true, planCode: mapped, legacyFreeExplorer: false };
  }

  if (metadataPlan === "explorer" && (amount == null || amount === 0)) {
    if (currency && currency !== "gbp") {
      return { ok: false, reason: "Legacy Explorer price currency is not GBP." };
    }
    return { ok: true, planCode: "explorer", legacyFreeExplorer: true };
  }

  return { ok: false, reason: "Subscription webhook has no approved price key." };
}

type PurchasableStripePrice = {
  id?: string | null;
  lookup_key?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  active?: boolean | null;
};

/** Server-side check before Checkout or a plan change uses a Stripe Price. */
export function assertPurchasableStripePrice(
  planCode: unknown,
  interval: unknown,
  price: PurchasableStripePrice | null | undefined,
): { priceId: string; lookupKey: string; amountPence: number } {
  const lookupKey = priceKeyForPlan(planCode, interval);
  const amountPence = pricePenceForPlan(planCode, interval);
  if (!lookupKey || amountPence == null) throw new Error("That plan cannot be purchased.");
  if (!price?.active || !price.id) throw new Error("Price not configured for this plan");
  if (price.lookup_key !== lookupKey) throw new Error("Price not configured for this plan");
  if ((price.currency ?? "").toLowerCase() !== "gbp") throw new Error("Price currency is not GBP");
  if (price.unit_amount !== amountPence) {
    throw new Error("Price amount does not match the approved catalog");
  }
  return { priceId: price.id, lookupKey, amountPence };
}

const INTEGRATION_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Checkout Dashboard label. The suffix is 8 random letters, per Stripe's tag. */
export function checkoutIntegrationIdentifier(flow: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let suffix = "";
  for (const byte of bytes) suffix += INTEGRATION_ALPHABET[byte % INTEGRATION_ALPHABET.length];
  const safe = flow
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return `blackstar_${safe || "checkout"}_${suffix}`;
}
