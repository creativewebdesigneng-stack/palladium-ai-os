import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const Route = createFileRoute("/api/launch/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!url || !key) return json({ error: "Backend not configured." }, 500);
        if (!token || token.split(".").length !== 3) return json({ error: "Unauthorized" }, 401);
        const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await supabase.auth.getClaims(token);
        const userId = data?.claims?.sub;
        if (error || typeof userId !== "string") return json({ error: "Unauthorized" }, 401);
        const { data: entitlement, error: readError } = await supabase
          .from("blackstar_pilot_access").select("stripe_customer_id")
          .eq("user_id", userId).in("status", ["active", "trialing"])
          .order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (readError) return json({ error: "Could not verify your billing account." }, 503);
        if (!entitlement?.stripe_customer_id) return json({ error: "No active Founding Pilot subscription was found." }, 404);
        const secret = process.env["STRIPE_SECRET_KEY"];
        const baseUrl = process.env["APP_BASE_URL"]?.replace(/\/$/, "");
        if (!secret || !baseUrl) return json({ error: "Billing portal is not configured." }, 503);
        try {
          const stripe = new Stripe(secret);
          const session = await stripe.billingPortal.sessions.create({
            customer: entitlement.stripe_customer_id,
            return_url: `${baseUrl}/billing`,
          });
          return json({ url: session.url }, 200);
        } catch (e) {
          console.error("[founding-pilot-portal]", e);
          return json({ error: "Could not open the billing portal." }, 502);
        }
      },
    },
  },
});
function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
