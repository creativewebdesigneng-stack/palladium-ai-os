import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import {
  type BillingInterval,
  normalizeInterval,
  normalizePlanCode,
  priceKeyForPlan,
} from "@/lib/billing/catalog";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      planCode: string;
      interval?: BillingInterval;
      orgId?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      const planCode = normalizePlanCode(data.planCode);
      if (!planCode) throw new Error("Unknown plan");
      if (planCode === "explorer") throw new Error("The Explorer plan is free — no checkout required");
      if (data.orgId && !UUID_RE.test(data.orgId)) throw new Error("Invalid organisation");
      if (!/^https?:\/\//.test(data.returnUrl)) throw new Error("Invalid return URL");
      return { ...data, planCode, interval: normalizeInterval(data.interval) };
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { supabase, userId } = context;

      // Organisation-scoped checkout requires membership; never trust the client.
      if (data.orgId) {
        const { data: member } = await supabase
          .from("organisation_members")
          .select("role")
          .eq("org_id", data.orgId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!member || !["owner", "admin"].includes(member.role as string)) {
          return { error: "You do not have permission to buy a plan for this organisation." };
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // The approved price is resolved server-side from the internal plan code.
      const priceKey = priceKeyForPlan(data.planCode, data.interval);
      if (!priceKey) return { error: "That plan cannot be purchased." };

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [priceKey], active: true });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Price not configured for this plan");

      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(user?.email ? { email: user.email } : {}),
        userId,
      });

      const metadata: Record<string, string> = { userId, planCode: data.planCode };
      if (data.orgId) metadata["orgId"] = data.orgId;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata,
        subscription_data: { metadata },
        managed_payments: { enabled: true },
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type SubscriptionRow = {
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_code: string | null;
  status: string;
};

async function loadOwnSubscription(
  supabase: any,
  userId: string,
  environment: StripeEnv,
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_customer_id, plan_code, status")
    .eq("user_id", userId)
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

type MutationResult = { ok: true } | { error: string };

/** Cancel at period end — access continues until current_period_end. */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const sub = await loadOwnSubscription(context.supabase, context.userId, data.environment);
    if (!sub?.stripe_subscription_id) return { error: "No active subscription to cancel." };
    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Undo a pending cancellation. */
export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const sub = await loadOwnSubscription(context.supabase, context.userId, data.environment);
    if (!sub?.stripe_subscription_id) return { error: "No subscription to resume." };
    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Upgrade or downgrade an existing subscription between approved plans. */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planCode: string; interval?: BillingInterval; environment: StripeEnv }) => {
    const planCode = normalizePlanCode(data.planCode);
    if (!planCode || planCode === "explorer") throw new Error("Unknown plan");
    return { ...data, planCode, interval: normalizeInterval(data.interval) };
  })
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const sub = await loadOwnSubscription(context.supabase, context.userId, data.environment);
    if (!sub?.stripe_subscription_id) {
      return { error: "No active subscription — start a checkout instead." };
    }
    const priceKey = priceKeyForPlan(data.planCode, data.interval);
    if (!priceKey) return { error: "That plan cannot be purchased." };
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [priceKey], active: true });
      const price = prices.data[0];
      if (!price) return { error: "Price not configured for this plan" };

      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const itemId = current.items.data[0]?.id;
      if (!itemId) return { error: "Subscription has no billable item" };

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: itemId, price: price.id, quantity: 1 }],
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        metadata: { ...(current.metadata ?? {}), userId: context.userId, planCode: data.planCode },
      });
      // Subscription state in the database is only updated by verified webhooks.
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return { error: "No subscription found" };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type BillingDataResult =
  | {
      subscription: {
        planCode: string | null;
        status: string;
        priceId: string | null;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
      } | null;
      invoices: Array<{
        id: string;
        status: string | null;
        amountPaid: number;
        currency: string;
        created: string | null;
        hostedInvoiceUrl: string | null;
        pdfUrl: string | null;
      }>;
    }
  | { error: string };

const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
const THREE_DECIMAL = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

function toMajorUnit(amount: number | null | undefined, currency: string): number {
  const value = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return value;
  if (THREE_DECIMAL.has(c)) return value / 1000;
  return value / 100;
}

export const getBillingData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<BillingDataResult> => {
    try {
      const { supabase, userId } = context;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select(
          "plan_code, status, stripe_price_id, stripe_customer_id, current_period_end, cancel_at_period_end",
        )
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let invoices: Array<{
        id: string;
        status: string | null;
        amountPaid: number;
        currency: string;
        created: string | null;
        hostedInvoiceUrl: string | null;
        pdfUrl: string | null;
      }> = [];

      if (sub?.stripe_customer_id) {
        const stripe = createStripeClient(data.environment);
        const list = await stripe.invoices.list({ customer: sub.stripe_customer_id, limit: 24 });
        invoices = list.data.map((inv) => ({
          id: inv.id ?? "",
          status: inv.status ?? null,
          amountPaid: toMajorUnit(inv.amount_paid, inv.currency),
          currency: inv.currency,
          created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
          pdfUrl: inv.invoice_pdf ?? null,
        }));
      }

      return {
        subscription: sub
          ? {
              planCode: sub.plan_code ?? null,
              status: sub.status,
              priceId: sub.stripe_price_id ?? null,
              currentPeriodEnd: sub.current_period_end ?? null,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            }
          : null,
        invoices,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
