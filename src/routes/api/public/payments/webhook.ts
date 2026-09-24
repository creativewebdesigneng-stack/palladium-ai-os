import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { planForPriceKey } from "@/lib/billing/catalog";
import { claimPaymentEvent, completePaymentEvent, releasePaymentEvent } from "@/lib/billing/payment-event-ledger.server";
import { preparePaidMarketplaceDelivery, verifyMarketplacePaidListingFee, verifyMarketplacePaidPurchase } from "@/lib/marketplace/fulfilment-evidence";

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
  if (error) throw new Error("Failed to record the subscription update.");

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
  if (error) throw new Error("Failed to record the subscription cancellation.");

  const { data: cancelled, error: lookupError } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id, plan_code")
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();
  if (lookupError) throw new Error("Could not load the cancelled subscription notification context.");
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

  const { data: sub, error: lookupError } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id")
    .eq("stripe_customer_id", customerId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error("Could not load the paid-invoice subscription.");
  if (!sub?.user_id) return;
  if (typeof invoice.id !== "string" || !invoice.id.startsWith("in_")) {
    throw new Error("Paid invoice has no authoritative Stripe invoice ID.");
  }
  // A handler may have written usage before a transient failure to save the
  // event marker. Detect that exact invoice on retry; concurrent deliveries
  // still require a transactional provider-event claim in the remaining E10 work.
  const { data: recorded, error: priorUsageError } = await getSupabase()
    .from("usage_records")
    .select("id")
    .eq("user_id", sub.user_id)
    .eq("metric", "billing.invoice_paid")
    .contains("metadata", { invoice_id: invoice.id, environment: env })
    .limit(1)
    .maybeSingle();
  if (priorUsageError) throw new Error("Could not inspect the paid invoice usage ledger.");
  if (recorded) return;

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
  if (error) throw new Error("Failed to record the paid invoice usage.");
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
  if (error) throw new Error("Failed to record the subscription payment failure.");

  const { data: sub, error: lookupError } = await getSupabase()
    .from("subscriptions")
    .select("user_id, org_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (lookupError) throw new Error("Could not load the failed-payment notification context.");
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

async function handleWebhook(req: Request, env: StripeEnv) {
  const event: any = await verifyWebhook(req, env);

  // Atomic database claim serialises simultaneous Stripe deliveries for the
  // same event ID across server instances. Busy events get a retryable 503.
  const db = getSupabase();
  const claim = await claimPaymentEvent(db, event, env);
  if (claim.status === "done") return;
  if (claim.status === "busy") throw new Error("Payment event is being processed by another worker.");

  let completed = false;
  try {
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
    case "invoice.payment_failed":
      await markPaymentFailed(event.data.object, env);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as any;
      if (session.metadata?.kind === "marketplace_listing_fee") {
        // A completed-but-unpaid Checkout session must never publish a listing.
        if (session.payment_status !== "paid") break;
        const listingId = session.metadata?.listing_id;
        const sellerId = session.metadata?.seller_id;
        if (!listingId || !sellerId) {
          throw new Error("Paid listing fee session has no authorised listing and seller references.");
        }
        const db = getSupabase();
        const { data: payment, error: paymentReadError } = await db
          .from("marketplace_listing_fee_payments")
          .select("listing_id,seller_id,stripe_checkout_session_id,amount_pence,currency,status,payment_provider")
          .eq("stripe_checkout_session_id", session.id)
          .eq("listing_id", listingId)
          .eq("seller_id", sellerId)
          .maybeSingle();
        if (paymentReadError || !payment) {
          throw new Error("Paid listing fee session has no matching Marketplace payment ledger.");
        }
        verifyMarketplacePaidListingFee(session, payment, listingId, sellerId, env);

        // A previously reviewed/published listing must not be pushed back into
        // moderation by a delayed or duplicate Checkout event.
        const { data: listing, error: listingReadError } = await db
          .from("marketplace_listings")
          .select("id,status,listing_fee_paid_at")
          .eq("id", listingId).eq("seller_id", sellerId).maybeSingle();
        if (listingReadError || !listing) throw new Error("Paid fee has no matching seller-owned listing.");
        if (payment.status === "paid" && listing.listing_fee_paid_at &&
          ["published", "unlisted", "sold"].includes(listing.status)) break;
        if (!["draft", "listing_fee_due", "rejected", "pending_review"].includes(listing.status)) {
          throw new Error("Paid listing fee cannot change the listing's current review state.");
        }
        if (!listing.listing_fee_paid_at) {
          const { data: marked, error: listingWriteError } = await db
            .from("marketplace_listings")
            .update({ listing_fee_paid_at: new Date().toISOString(), status: "pending_review", updated_at: new Date().toISOString() })
            .eq("id", listingId).eq("seller_id", sellerId)
            .is("listing_fee_paid_at", null)
            .in("status", ["draft", "listing_fee_due", "rejected", "pending_review"])
            .select("id").maybeSingle();
          if (listingWriteError || !marked) throw new Error("Could not update the paid listing's review status.");
        }
        // A retried event may follow a successful moderation insertion but a
        // failed payment-ledger update. Do not create another case on replay.
        const { data: priorCase, error: moderationReadError } = await db
          .from("marketplace_moderation_cases")
          .select("id").eq("listing_id", listingId).eq("seller_id", sellerId)
          .limit(1).maybeSingle();
        if (moderationReadError) throw new Error("Could not inspect the listing moderation queue.");
        if (!priorCase) {
          const { error: moderationError } = await db
            .from("marketplace_moderation_cases")
            .insert({ listing_id: listingId, seller_id: sellerId, status: "pending" });
          if (moderationError) throw new Error("Could not queue the paid listing for moderation.");
        }
        // Record fee settlement last; a partial processing failure can be
        // retried without resetting the listing or creating a new review case.
        if (payment.status === "pending") {
          const { data: markedPayment, error: paymentWriteError } = await db
            .from("marketplace_listing_fee_payments")
            .update({ status: "paid", paid_at: new Date().toISOString(), provider_payment_id: session.id })
            .eq("stripe_checkout_session_id", session.id)
            .eq("listing_id", listingId).eq("seller_id", sellerId)
            .eq("status", "pending").select("id").maybeSingle();
          if (paymentWriteError || !markedPayment) throw new Error("Could not record the verified listing fee payment.");
        }
        break;
      }
      if (session.metadata?.kind === "marketplace_purchase") {
        // Asynchronous methods can complete Checkout before the payment is
        // actually paid. A completed session alone never means delivery.
        if (session.payment_status !== "paid") break;
        if (!session.metadata?.order_id || !session.metadata?.buyer_id || !session.metadata?.seller_id) {
          throw new Error("Paid marketplace session lacks an authoritative order reference.");
        }
        const db = getSupabase();
        const { data: order, error: orderReadError } = await db
          .from("marketplace_orders")
          .select("id,listing_id,buyer_id,seller_id,sale_price_pence,currency,status,stripe_payment_intent_id")
          .eq("id", session.metadata.order_id)
          .eq("stripe_checkout_session_id", session.id)
          .eq("buyer_id", session.metadata.buyer_id)
          .eq("seller_id", session.metadata.seller_id)
          .maybeSingle();
        if (orderReadError || !order) throw new Error("Paid session does not match a recorded marketplace order.");
        verifyMarketplacePaidPurchase(session, order, env);
        // Never revert a refunded, disputed, cancelled or already fulfilled
        // order to 'paid' merely because a duplicate payment event arrived.
        if (!["pending", "paid"].includes(order.status)) break;
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent : session.payment_intent?.id;
        if (typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
          throw new Error("Paid marketplace session lacks a verified payment intent reference.");
        }
        if (order.status === "pending") {
          const { data: paid, error: paidError } = await db
            .from("marketplace_orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", order.id).eq("stripe_checkout_session_id", session.id).eq("status", "pending")
            .select("id").maybeSingle();
          if (paidError || !paid) throw new Error("Could not record the verified marketplace payment.");
        }
        const { data: existingDelivery, error: deliveryReadError } = await db
          .from("marketplace_deliveries").select("id,status").eq("order_id", order.id).maybeSingle();
        if (deliveryReadError) throw new Error("Could not check the marketplace delivery ledger.");
        if (!existingDelivery) {
          const { data: listing, error: listingError } = await db
            .from("marketplace_listings").select("delivery_type")
            .eq("id", order.listing_id).eq("seller_id", order.seller_id).maybeSingle();
          if (listingError || !listing) throw new Error("Paid order has no valid listing delivery configuration.");
          const { error: deliveryError } = await db
            .from("marketplace_deliveries").insert(preparePaidMarketplaceDelivery(order, listing));
          if (deliveryError && deliveryError.code !== "23505") {
            throw new Error("Could not record the pending marketplace delivery.");
          }
        }
        break;
      }
      await handleCheckoutCompleted(session, env);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as any;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        const { error: refundError } = await getSupabase().from("marketplace_orders")
          .update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
        if (refundError) throw new Error("Could not reconcile the marketplace charge refund.");
      }
      break;
    }
    default:
      console.log("Unhandled payments event:", event.type);
  }
  await completePaymentEvent(db, event, env, claim.token);
  completed = true;
  } finally {
    if (!completed) await releasePaymentEvent(db, event, env, claim.token);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Payments webhook with invalid env:", rawEnv);
          return Response.json({ error: "Invalid payment environment" }, { status: 400 });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Payments webhook error:", e);
          return new Response("Webhook processing failed", { status: 503 });
        }
      },
    },
  },
});
