import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/launch/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env["STRIPE_SECRET_KEY"];
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
        const supabaseUrl = process.env["SUPABASE_URL"];
        if (!secretKey || !webhookSecret || !supabaseUrl) {
          return Response.json({ error: "Webhook is not configured." }, { status: 503 });
        }
        const signature = request.headers.get("stripe-signature");
        if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
        const rawBody = await request.text();
        const stripe = new Stripe(secretKey);
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch {
          return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
        }
        const configuredMode = process.env["STRIPE_MODE"] ?? "test";
        if (configuredMode !== "test" && configuredMode !== "live") return Response.json({ error: "Invalid Stripe mode." }, { status: 503 });
        if (configuredMode === "test" && !secretKey.startsWith("sk_test_")) return Response.json({ error: "Test deployments must use a Stripe test secret key." }, { status: 503 });
        if (event.livemode !== (configuredMode === "live")) return Response.json({ error: "Stripe event mode does not match this deployment." }, { status: 400 });
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        try {
          if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.metadata?.["kind"] !== "blackstar_founding_pilot" || !session.subscription || !session.customer) {
              return Response.json({ received: true });
            }
            const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
            await saveEntitlement(db, subscription, String(session.customer), event.livemode ? "live" : "test");
          } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            if (subscription.metadata?.["kind"] !== "blackstar_founding_pilot") return Response.json({ received: true });
            const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
            await saveEntitlement(db, subscription, customerId, event.livemode ? "live" : "test");
          }
          return Response.json({ received: true });
        } catch (error) {
          console.error("[founding-pilot-webhook]", error);
          return Response.json({ error: "Entitlement reconciliation failed." }, { status: 503 });
        }
      },
    },
  },
});

async function saveEntitlement(db: any, subscription: Stripe.Subscription, customerId: string, environment: "test" | "live") {
  const userId = subscription.metadata?.["userId"];
  if (!userId) throw new Error("Founding Pilot subscription is missing userId metadata.");
  const status = subscription.status;
  const { data: existing, error: existingError } = await db.from("blackstar_pilot_access")
    .select("beta_features").eq("stripe_subscription_id", subscription.id).maybeSingle();
  if (existingError) throw new Error("Could not read existing Founding Pilot feature grants.");
  const betaFeatures = Array.isArray(existing?.beta_features) ? existing.beta_features : ["billing"];
  const { error } = await db.from("blackstar_pilot_access").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    environment,
    beta_features: betaFeatures,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error("Could not persist Founding Pilot entitlement.");
}
