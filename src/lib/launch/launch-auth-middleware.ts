import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getFeatureAccess } from "@/lib/launch/feature-access";
import type { FeatureId } from "@/lib/launch/feature-registry";

/**
 * Feature-aware server-function middleware. The preceding Supabase middleware
 * supplies verified identity and claims. Pilot status and beta grants are read
 * from the server-owned entitlement table, never from client input.
 */
export function requireLaunchFeatureAuth(featureId: FeatureId) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const claims = context.claims as Record<string, unknown>;
      const email = typeof claims["email"] === "string" ? claims["email"] : null;
      const env = process.env as Record<string, string | undefined>;
      let access = getFeatureAccess(featureId, { email }, env);

      if (!access.allowed) {
        const sb = context.supabase as unknown as { from: (table: string) => any };
        const { data: pilot, error } = await sb
          .from("blackstar_pilot_access")
          .select("status,beta_features")
          .eq("user_id", context.userId)
          .eq("environment", process.env["STRIPE_MODE"] === "live" ? "live" : "test")
          .in("status", ["active", "trialing"])
          .maybeSingle();
        if (error) throw new Error("Launch access could not be verified.");
        access = getFeatureAccess(featureId, {
          email,
          isPilotCustomer: Boolean(pilot),
          betaFeatures: Array.isArray(pilot?.beta_features) ? pilot.beta_features : [],
        }, env);
      }

      if (!access.allowed) {
        const error = new Error("This feature is not enabled for your account yet.") as Error & {
          status: number;
          code: string;
        };
        error.status = 403;
        error.code = "FEATURE_NOT_ENABLED";
        throw error;
      }
      return next();
    });
}
