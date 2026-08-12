/**
 * Canonical PalladiumAI plan <-> Stripe price mapping.
 *
 * The backend NEVER accepts a Stripe price id from the frontend. Clients send
 * an internal plan code (`explorer` | `builder` | `business` | `enterprise`)
 * plus a billing interval, and this module resolves the approved Stripe price
 * lookup key. Anything unknown is rejected.
 *
 * Prices (GBP, sandbox + live use the same human-readable lookup keys):
 *   Explorer    £0        no Stripe price — free tier
 *   Builder     £20/mo    pro_monthly / pro_yearly
 *   Business    £1,500/mo business_monthly / business_yearly
 *   Enterprise  £3,000/mo enterprise_monthly / enterprise_yearly
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

/** Returns the approved Stripe lookup key, or null for free / unknown plans. */
export function priceKeyForPlan(planCode: unknown, interval: unknown): string | null {
  const code = normalizePlanCode(planCode);
  if (!code || code === "explorer") return null;
  return PLAN_PRICE_KEYS[code][normalizeInterval(interval)];
}

export function planForPriceKey(priceKey: unknown): PlanCode | null {
  if (typeof priceKey !== "string") return null;
  return PLAN_BY_PRICE_KEY[priceKey] ?? null;
}
