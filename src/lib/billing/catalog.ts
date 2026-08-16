/**
 * Canonical PalladiumAI plan <-> Stripe price mapping.
 *
 * The backend NEVER accepts a Stripe price id from the frontend. Clients send
 * an internal plan code (`explorer` | `builder` | `business` | `enterprise`)
 * plus a billing interval, and this module resolves the approved Stripe price
 * lookup key and expected GBP amount. Anything unknown is rejected.
 *
 * Current paid pricing (GBP, sandbox + live use the same lookup keys):
 *   Builder     £150/mo   | £1,530/yr  pro_monthly / pro_yearly
 *   Business    £1,500/mo | £15,300/yr business_monthly / business_yearly
 *   Enterprise  £3,500/mo | £35,700/yr enterprise_monthly / enterprise_yearly
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
  builder: { monthly: "pro_monthly", yearly: "pro_yearly" },
  business: { monthly: "business_monthly", yearly: "business_yearly" },
  enterprise: { monthly: "enterprise_monthly", yearly: "enterprise_yearly" },
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
  pro_monthly: "builder",
  pro_yearly: "builder",
  business_monthly: "business",
  business_yearly: "business",
  enterprise_monthly: "enterprise",
  enterprise_yearly: "enterprise",
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
  return PLAN_BY_PRICE_KEY[priceKey] ?? null;
}
