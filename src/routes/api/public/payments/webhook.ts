import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
  }
  return _supabase;
}

// Stripe statuses -> subscription_status enum in the database.
const STATUS_MAP: Record<string, string> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "incomplete",
  unpaid: "unpaid",
  paused: "paused",
};

// Human readable price lookup keys -> plan codes in public.plans.
const PLAN_BY_PRICE: Record<string, string> = {
  pro_monthly: "pro",
  pro_yearly: "pro",
  business_monthly: "business",
  business_yearly: "business",
  enterprise_monthly: "enterprise",
  enterprise_yearly: "enterprise",
};

function resolvePriceKey(item: any): string | null {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id || null;
}

function iso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Subscription webhook without userId metadata:", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceKey = resolvePriceKey(item);
  const planCode = (priceKey && PLAN_BY_PRICE[priceKey]) || "pro";
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const row: Record<string, unknown> = {
    user_id: userId,
    org_id: subscription.metadata?.orgId ?? null,
    plan_code: planCode,
    status: STATUS_MAP[subscription.status] ?? "incomplete",
    seats: item?.quantity ?? 1,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceKey,
    stripe_product_id: productId ?? null,
    current_period_start: iso(periodStart),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    trial_ends_at: iso(subscription.trial_end),
    environment: env,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getSupabase()
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) console.error("Failed to upsert subscription:", error.message);
}

async function markCanceled(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) console.error("Failed to cancel subscription:", error.message);
}

async function recordUsage(invoice: any, env: StripeEnv) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: sub } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id")
    .eq("stripe_customer_id", customerId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub?.user_id) return;

  const { error } = await getSupabase().from("usage_records").insert({
    user_id: sub.user_id,
    org_id: sub.org_id ?? null,
    metric: "billing.invoice_paid",
    quantity: (invoice.amount_paid ?? 0) / 100,
    unit: invoice.currency ?? "gbp",
    period_start: new Date().toISOString().slice(0, 8) + "01",
    metadata: { invoice_id: invoice.id, environment: env },
  });
  if (error) console.error("Failed to record usage:", error.message);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "invoice.paid":
      await recordUsage(event.data.object, env);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Subscription state arrives through customer.subscription.* events.
      break;
    default:
      console.log("Unhandled payments event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Payments webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Payments webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
