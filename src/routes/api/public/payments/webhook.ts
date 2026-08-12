import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { planForPriceKey } from "@/lib/billing/catalog";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
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

function resolvePriceKey(item: any): string | null {
  return (
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id || null
  );
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
  const planCode = planForPriceKey(priceKey) ?? "builder";
  const productId =
    typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const row: Record<string, unknown> = {
    user_id: userId,
    org_id: subscription.metadata?.orgId ?? null,
    plan_code: planCode,
    status: STATUS_MAP[subscription.status] ?? "incomplete",
    seats: item?.quantity ?? 1,
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
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

  const { notify } = await import("@/lib/notifications/notify.server");
  await notify({
    userId,
    orgId: (subscription.metadata?.orgId as string | undefined) ?? null,
    type: "subscription.changed",
    title: `Your subscription is now ${String(row["status"]).replace(/_/g, " ")}`,
    body: `Plan: ${planCode}${row["cancel_at_period_end"] ? " — cancels at the end of the period." : "."}`,
    link: "/billing",
    metadata: { plan_code: planCode, status: row["status"] },
  });
}

async function markCanceled(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      current_period_end: iso(
        subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) console.error("Failed to cancel subscription:", error.message);

  const { data: cancelled } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id, plan_code")
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();
  if (cancelled?.user_id) {
    const { notify } = await import("@/lib/notifications/notify.server");
    await notify({
      userId: cancelled.user_id,
      orgId: cancelled.org_id ?? null,
      type: "subscription.changed",
      title: "Your subscription has been cancelled",
      body: `The ${cancelled.plan_code ?? "current"} plan will not renew.`,
      link: "/billing",
      metadata: { status: "canceled" },
    });
  }
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

  const { error } = await getSupabase()
    .from("usage_records")
    .insert({
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

async function markPaymentFailed(invoice: any, env: StripeEnv) {
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env);
  if (error) console.error("Failed to mark subscription past_due:", error.message);

  const { data: sub } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (sub?.user_id) {
    const { notify } = await import("@/lib/notifications/notify.server");
    await notify({
      userId: sub.user_id,
      orgId: sub.org_id ?? null,
      type: "payment.failed",
      title: "A payment could not be collected",
      body: "Your latest invoice failed, so the subscription is marked past due. Update your payment method to keep access.",
      link: "/billing",
      metadata: { invoice_id: invoice.id ?? null },
    });
  }
}

/**
 * Checkout completion is a safety net: `customer.subscription.created` normally
 * carries the state, but if it is delayed or dropped we resolve the subscription
 * from Stripe directly (never from client input) and upsert it.
 */
async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  if (session.payment_status === "unpaid") return;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return;

  const stripe = createStripeClient(env);
  const subscription: any = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  if (!subscription.metadata?.userId && session.metadata?.userId) {
    subscription.metadata = { ...(subscription.metadata ?? {}), ...session.metadata };
  }
  await upsertSubscription(subscription, env);
}

/** Returns true when this event has not been processed before. */
async function claimEvent(event: any, env: StripeEnv): Promise<boolean> {
  if (!event?.id) return true;
  const { error } = await getSupabase()
    .from("billing_webhook_events")
    .insert({ event_id: event.id, type: event.type, environment: env });
  if (!error) return true;
  // 23505 = unique violation -> already handled, ack without reprocessing.
  if ((error as any).code === "23505") return false;
  console.error("Failed to record webhook event:", error.message);
  return true;
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event: any = await verifyWebhook(req, env);

  const fresh = await claimEvent(event, env);
  if (!fresh) {
    console.log("Duplicate payments event ignored:", event.id);
    return;
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "invoice.paid":
      await recordUsage(event.data.object, env);
      break;
    case "invoice.payment_failed":
      await markPaymentFailed(event.data.object, env);
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
