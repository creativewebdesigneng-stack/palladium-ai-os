import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { queueRunSteering } from "@/lib/runtime/run-steering.server";
import { getFeatureAccess } from "@/lib/launch/feature-access";

/** Owner-authenticated endpoint for steering an active agent run. */
export const Route = createFileRoute("/api/agents/steer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return json({ error: "Backend not configured." }, 500);

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token || token.split(".").length !== 3) return json({ error: "Unauthorized" }, 401);

        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        const email = claims?.claims?.email;
        if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);
        const actor = { email: typeof email === "string" ? email : null };
        let access = getFeatureAccess("agent_runtime", actor, process.env as Record<string, string | undefined>);
        if (!access.allowed) {
          const { data: pilot, error: pilotError } = await supabase
            .from("blackstar_pilot_access")
            .select("status,beta_features")
            .eq("user_id", userId)
            .eq("environment", process.env["STRIPE_MODE"] === "live" ? "live" : "test")
            .in("status", ["active", "trialing"])
            .maybeSingle();
          if (pilotError) return json({ error: "Launch access could not be verified." }, 503);
          access = getFeatureAccess("agent_runtime", {
            ...actor,
            isPilotCustomer: Boolean(pilot),
            betaFeatures: Array.isArray(pilot?.beta_features) ? pilot.beta_features : [],
          }, process.env as Record<string, string | undefined>);
        }
        if (!access.allowed) return json({ error: "This feature is not available for your account yet.", code: "FEATURE_NOT_ENABLED" }, 403);

        let body: { task_id?: string; message?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "Invalid request body." }, 400);
        }
        if (!body.task_id) return json({ error: "A running task is required." }, 400);

        try {
          const steering = await queueRunSteering({
            sb: supabase as unknown as { from: (table: string) => any },
            userId,
            taskId: body.task_id,
            message: String(body.message ?? ""),
          });
          return json({ ok: true, steering }, 202);
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : "Could not steer that run." },
            409,
          );
        }
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
