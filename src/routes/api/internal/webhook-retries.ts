import { createFileRoute } from "@tanstack/react-router";
import { processDueWebhookRetries } from "@/lib/devapi/webhooks.server";
import { isValidRuntimeWorkerToken } from "@/lib/runtime/runtime-worker-auth.server";

/**
 * Scheduler endpoint for the durable webhook retry queue.
 *
 * Configure a deployment cron to POST here with:
 *   Authorization: Bearer <WEBHOOK_RETRY_CRON_SECRET>
 *
 * The secret is server-only and the endpoint accepts no delivery payloads,
 * webhook ids, destinations or user ids from the caller.
 */
export const Route = createFileRoute("/api/internal/webhook-retries")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization") ?? "";
        const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!(await isValidRuntimeWorkerToken("webhook_retry", supplied))) {
          return json({ error: "Unauthorized" }, 401);
        }

        const execute = async () => {
          const url = new URL(request.url);
          const requested = Number(url.searchParams.get("limit") ?? 20);
          const limit = Number.isFinite(requested)
            ? Math.max(1, Math.min(50, Math.trunc(requested)))
            : 20;

          try {
            const result = await processDueWebhookRetries(limit);
            return json({ ok: true, ...result }, 200);
          } catch (error) {
            console.error("[runtime-worker] webhook retry processing unavailable", {
              errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return json({ ok: false, error: "Worker unavailable" }, 503);
          }
        };

        const forwardedAdminKey =
          request.headers.get("x-blackstar-supabase-secret-key")?.trim() ?? "";
        if (!forwardedAdminKey) return execute();

        try {
          const { withRequestScopedSupabaseAdminKey } = await import(
            "@/integrations/supabase/client.server"
          );
          return await withRequestScopedSupabaseAdminKey(forwardedAdminKey, execute);
        } catch {
          console.error("[runtime-worker] request-scoped database credential rejected", {
            worker: "webhook_retry",
          });
          return json({ error: "Runtime worker database credential unavailable" }, 503);
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
