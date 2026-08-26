import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { queueRunSteering } from "@/lib/runtime/run-steering.server";

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
        if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);

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
