import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { FEATURE_REGISTRY, resolveFeatureStatus, type FeatureId } from "@/lib/launch/feature-registry";

export const Route = createFileRoute("/api/launch/grants")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!url || !key) return json({ error: "Backend not configured." }, 500);
        if (!token || token.split(".").length !== 3) return json({ error: "Unauthorized" }, 401);
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.auth.getClaims(token);
        const claims = data?.claims as Record<string, unknown> | undefined;
        const email = typeof claims?.["email"] === "string" ? claims["email"] : "";
        if (error || typeof claims?.["sub"] !== "string") return json({ error: "Unauthorized" }, 401);
        if (!process.env["BLACKSTAR_ADMIN_EMAIL"] ||
          email.trim().toLowerCase() !== process.env["BLACKSTAR_ADMIN_EMAIL"].trim().toLowerCase()) {
          return json({ error: "Administrator access required." }, 403);
        }

        let body: { userId?: string; betaFeatures?: unknown };
        try { body = await request.json() as typeof body; }
        catch { return json({ error: "Invalid request body." }, 400); }
        if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId)) {
          return json({ error: "A valid userId is required." }, 400);
        }
        if (!Array.isArray(body.betaFeatures) || body.betaFeatures.some((id) => typeof id !== "string")) {
          return json({ error: "betaFeatures must be an array of feature IDs." }, 400);
        }
        const valid = new Set(Object.keys(FEATURE_REGISTRY));
        const requested = [...new Set(body.betaFeatures as string[])];
        if (requested.some((id) => !valid.has(id))) return json({ error: "Unknown feature ID." }, 400);
        const env = process.env as Record<string, string | undefined>;
        if (requested.some((id) => resolveFeatureStatus(id as FeatureId, env) !== "beta")) {
          return json({ error: "Only features currently configured as beta can be granted to a pilot." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin: any = supabaseAdmin;
        const { data: updated, error: updateError } = await admin
          .from("blackstar_pilot_access")
          .update({ beta_features: requested, updated_at: new Date().toISOString() })
          .eq("user_id", body.userId)
          .eq("environment", process.env["STRIPE_MODE"] === "live" ? "live" : "test")
          .in("status", ["active", "trialing"])
          .select("user_id,beta_features,status")
          .maybeSingle();
        if (updateError) return json({ error: "Could not update pilot feature grants." }, 503);
        if (!updated) return json({ error: "No active pilot subscription found for that user in this Stripe mode." }, 404);
        return json({ ok: true, entitlement: updated }, 200);
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
