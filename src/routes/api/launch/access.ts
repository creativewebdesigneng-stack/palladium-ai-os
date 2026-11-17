import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getVisibleFeatures, isLaunchAdmin } from "@/lib/launch/feature-access";
import { resolveFeatureStatuses } from "@/lib/launch/feature-registry";

export const Route = createFileRoute("/api/launch/access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
        const userId = typeof claims?.["sub"] === "string" ? claims.sub : null;
        const email = typeof claims?.["email"] === "string" ? claims.email : null;
        if (error || !userId) return json({ error: "Unauthorized" }, 401);

        const env = process.env as Record<string, string | undefined>;
        const admin = isLaunchAdmin({ email }, env);
        if (admin) {
          return json({
            isAdmin: true,
            isPilotCustomer: true,
            betaFeatures: Object.keys(resolveFeatureStatuses(env)),
            visibleFeatures: getVisibleFeatures({ email }, env),
            statuses: resolveFeatureStatuses(env),
          }, 200);
        }

        const { data: entitlement, error: entitlementError } = await supabase
          .from("blackstar_pilot_access")
          .select("status,beta_features")
          .eq("user_id", userId)
          .in("status", ["active", "trialing"])
          .eq("environment", process.env["STRIPE_MODE"] === "live" ? "live" : "test")
          .maybeSingle();
        if (entitlementError) {
          console.error("[launch-access] pilot entitlement lookup failed", entitlementError.message);
          return json({ error: "Launch access could not be verified." }, 503);
        }

        const actor = {
          email,
          isPilotCustomer: Boolean(entitlement),
          betaFeatures: Array.isArray(entitlement?.beta_features) ? entitlement.beta_features : [],
        };
        return json({
          isAdmin: isLaunchAdmin(actor, env),
          isPilotCustomer: actor.isPilotCustomer,
          betaFeatures: actor.betaFeatures,
          visibleFeatures: getVisibleFeatures(actor, env),
          statuses: resolveFeatureStatuses(env),
        }, 200);
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}
