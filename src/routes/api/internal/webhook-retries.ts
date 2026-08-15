import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { processDueWebhookRetries } from "@/lib/devapi/webhooks.server";

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
        const expected = process.env["WEBHOOK_RETRY_CRON_SECRET"] ?? "";
        if (expected.length < 32) {
          return json({ error: "Webhook retry scheduler is not configured." }, 503);
        }

        const authorization = request.headers.get("authorization") ?? "";
        const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!safeEqual(supplied, expected)) return json({ error: "Unauthorized" }, 401);

        const url = new URL(request.url);
        const requested = Number(url.searchParams.get("limit") ?? 20);
        const limit = Number.isFinite(requested)
          ? Math.max(1, Math.min(50, Math.trunc(requested)))
          : 20;
        const result = await processDueWebhookRetries(limit);
        return json({ ok: true, ...result }, 200);
      },
    },
  },
});

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
