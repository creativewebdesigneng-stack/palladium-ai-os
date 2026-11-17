import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const Route = createFileRoute("/api/launch/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticatedUser(request);
        if (auth instanceof Response) return auth;
        const allowedEmails = (process.env["BLACKSTAR_PILOT_INVITE_EMAILS"] ?? "")
          .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
        if (!auth.email || !allowedEmails.includes(auth.email.toLowerCase())) {
          return json({ error: "Founding Pilot access is invite-only. Contact Blackstar for an invitation." }, 403);
        }
        const mode = process.env["STRIPE_MODE"] ?? "test";
        const secret = process.env["STRIPE_SECRET_KEY"];
        if (mode !== "test" && mode !== "live") return json({ error: "STRIPE_MODE must be test or live." }, 503);
        if (mode === "test" && secret && !secret.startsWith("sk_test_")) {
          return json({ error: "Test deployments must use a Stripe test secret key." }, 503);
        }
        const setupPrice = process.env["STRIPE_FOUNDING_PILOT_SETUP_PRICE_ID"];
        const monthlyPrice = process.env["STRIPE_FOUNDING_PILOT_MONTHLY_PRICE_ID"];
        const baseUrl = process.env["APP_BASE_URL"]?.replace(/\/$/, "");
        if (!secret || !setupPrice || !monthlyPrice || !baseUrl) {
          return json({ error: "Founding Pilot checkout is not configured yet." }, 503);
        }
        try {
          const stripe = new Stripe(secret);
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [
              { price: setupPrice, quantity: 1 },
              { price: monthlyPrice, quantity: 1 },
            ],
            customer_email: auth.email ?? undefined,
            client_reference_id: auth.userId,
            metadata: { kind: "blackstar_founding_pilot", userId: auth.userId },
            subscription_data: {
              metadata: { kind: "blackstar_founding_pilot", userId: auth.userId },
            },
            success_url: `${baseUrl}/founding-pilot?checkout=success`,
            cancel_url: `${baseUrl}/founding-pilot?checkout=cancelled`,
            allow_promotion_codes: false,
          });
          return json({ url: session.url }, 200);
        } catch (error) {
          console.error("[founding-pilot-checkout]", error);
          return json({ error: "Could not start secure checkout." }, 502);
        }
      },
    },
  },
});

async function authenticatedUser(request: Request): Promise<{ userId: string; email: string | null } | Response> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!url || !key) return json({ error: "Backend not configured." }, 500);
  if (!token || token.split(".").length !== 3) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getClaims(token);
  const claims = data?.claims as Record<string, unknown> | undefined;
  if (error || typeof claims?.["sub"] !== "string") return json({ error: "Unauthorized" }, 401);
  return { userId: claims.sub, email: typeof claims["email"] === "string" ? claims.email : null };
}
function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
