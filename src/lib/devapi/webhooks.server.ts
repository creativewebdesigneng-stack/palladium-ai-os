/**
 * Outbound webhook dispatch with durable retries.
 *
 * Every delivery is authenticated: the body is signed with the subscriber's
 * signing secret (HMAC-SHA256) and sent with a timestamp so receivers can
 * reject replays. Failed delivery rows are retried with bounded backoff and
 * eventually dead-lettered instead of being silently abandoned.
 */
import { hmacSha256Hex } from "./keys.server";
import { validateWebhookUrl } from "./webhook-url";
import type { WebhookEvent } from "./plans";

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 5;
const CLAIM_LEASE_MS = 2 * 60_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;

type DispatchArgs = {
  userId: string;
  orgId?: string | null;
  event: WebhookEvent | string;
  payload: Record<string, unknown>;
};

type DeliveryAttempt = {
  succeeded: boolean;
  status: number | null;
  error: string | null;
  durationMs: number;
};

/** Pure helper so retry timing is regression-testable. */
export function webhookRetryDelayMs(attemptsCompleted: number): number | null {
  if (attemptsCompleted >= MAX_ATTEMPTS) return null;
  const index = Math.max(0, Math.min(RETRY_DELAYS_MS.length - 1, attemptsCompleted - 1));
  return RETRY_DELAYS_MS[index] ?? null;
}

function retryTimestamp(attemptsCompleted: number, now = Date.now()): string | null {
  const delay = webhookRetryDelayMs(attemptsCompleted);
  return delay == null ? null : new Date(now + delay).toISOString();
}

/** Sends an event to every active webhook subscribed to it. Never throws. */
export async function dispatchWebhookEvent(args: DispatchArgs): Promise<{ delivered: number }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;

    // Opportunistically drain a few old failures. A production scheduler can
    // call processDueWebhookRetries independently using this same durable queue.
    await processDueWebhookRetriesWithAdmin(admin, 3);

    const query = admin
      .from("webhooks")
      .select("id,url,events,signing_secret,is_active,user_id,org_id,failure_count,delivery_count")
      .eq("is_active", true)
      .contains("events", [args.event]);

    const { data: hooks } = args.orgId
      ? await query.eq("org_id", args.orgId)
      : await query.eq("user_id", args.userId);

    if (!hooks?.length) return { delivered: 0 };

    let delivered = 0;
    // A hook whose secret was revoked cannot receive a signed payload, so it is skipped.
    for (const hook of hooks.filter((h: any) => h.signing_secret)) {
      const ok = await deliver(admin, hook, args);
      if (ok) delivered += 1;
    }
    return { delivered };
  } catch (error) {
    console.error("[webhooks] dispatch failed", error);
    return { delivered: 0 };
  }
}

async function sendEnvelope(
  hook: any,
  event: string,
  envelope: Record<string, unknown>,
): Promise<DeliveryAttempt> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(envelope);
  const signature = await hmacSha256Hex(hook.signing_secret, `${timestamp}.${body}`);
  const startedAt = Date.now();
  let status: number | null = null;
  let error: string | null = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Re-validate the stored URL on every attempt; a retry never trusts the URL
    // merely because it passed validation at creation time.
    const targetUrl = validateWebhookUrl(hook.url);
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "PalladiumAI-Webhooks/1.0",
        "x-palladium-event": event,
        "x-palladium-timestamp": String(timestamp),
        "x-palladium-signature": `v1=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    status = res.status;
    if (!res.ok) error = `Endpoint responded ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Delivery failed";
  } finally {
    clearTimeout(timer);
  }

  return {
    succeeded: status !== null && status >= 200 && status < 300,
    status,
    error,
    durationMs: Date.now() - startedAt,
  };
}

async function updateHookHealth(admin: any, hook: any, succeeded: boolean) {
  const nextFailures = succeeded ? 0 : (Number(hook.failure_count) || 0) + 1;
  await admin
    .from("webhooks")
    .update({
      last_delivery_at: new Date().toISOString(),
      delivery_count: (Number(hook.delivery_count) || 0) + 1,
      failure_count: nextFailures,
      is_active: succeeded || nextFailures < 20,
    })
    .eq("id", hook.id);
}

async function deliver(admin: any, hook: any, args: DispatchArgs): Promise<boolean> {
  const envelope = {
    id: crypto.randomUUID(),
    event: args.event,
    created_at: new Date().toISOString(),
    data: args.payload,
  };
  const attempt = await sendEnvelope(hook, String(args.event), envelope);
  const now = new Date().toISOString();
  const nextAttemptAt = attempt.succeeded ? null : retryTimestamp(1);

  await admin.from("webhook_deliveries").insert({
    webhook_id: hook.id,
    user_id: hook.user_id,
    org_id: hook.org_id ?? null,
    event: args.event,
    payload: envelope,
    status: attempt.succeeded ? "delivered" : "failed",
    attempts: 1,
    response_status: attempt.status,
    error: attempt.error,
    duration_ms: attempt.durationMs,
    delivered_at: attempt.succeeded ? now : null,
    last_attempt_at: now,
    next_attempt_at: nextAttemptAt,
    dead_lettered_at: null,
  });

  await updateHookHealth(admin, hook, attempt.succeeded);
  return attempt.succeeded;
}

/**
 * Process due failed deliveries. The `next_attempt_at` row is moved forward by
 * a short lease before network I/O, so concurrent workers cannot normally send
 * the same retry. If a worker crashes, the lease expires and the row is due
 * again rather than becoming stuck forever.
 */
async function processDueWebhookRetriesWithAdmin(
  admin: any,
  limit = 10,
): Promise<{ retried: number; delivered: number; deadLettered: number }> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit) || 10));
  const now = new Date().toISOString();
  const { data: due } = await admin
    .from("webhook_deliveries")
    .select("id,webhook_id,user_id,org_id,event,payload,status,attempts,next_attempt_at,dead_lettered_at")
    .eq("status", "failed")
    .is("dead_lettered_at", null)
    .not("next_attempt_at", "is", null)
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(safeLimit);

  let retried = 0;
  let delivered = 0;
  let deadLettered = 0;

  for (const row of due ?? []) {
    const oldNext = row.next_attempt_at;
    if (!oldNext) continue;

    // Claim with an expiring lease. Equality on the previous due timestamp makes
    // the update first-writer-wins across concurrent retry processors.
    const leaseUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
    const { data: claimed } = await admin
      .from("webhook_deliveries")
      .update({ next_attempt_at: leaseUntil })
      .eq("id", row.id)
      .eq("status", "failed")
      .eq("next_attempt_at", oldNext)
      .is("dead_lettered_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const { data: hook } = await admin
      .from("webhooks")
      .select("id,url,signing_secret,is_active,user_id,org_id,failure_count,delivery_count")
      .eq("id", row.webhook_id)
      .maybeSingle();

    const attempts = Math.max(1, Number(row.attempts) || 1) + 1;
    retried += 1;

    if (!hook?.signing_secret || hook.is_active === false) {
      const deadAt = new Date().toISOString();
      await admin
        .from("webhook_deliveries")
        .update({
          attempts,
          next_attempt_at: null,
          last_attempt_at: deadAt,
          dead_lettered_at: deadAt,
          error: !hook ? "Webhook no longer exists" : "Webhook is inactive or its signing secret was revoked",
        })
        .eq("id", row.id);
      deadLettered += 1;
      continue;
    }

    const envelope = row.payload && typeof row.payload === "object"
      ? row.payload
      : { id: crypto.randomUUID(), event: row.event, created_at: new Date().toISOString(), data: {} };
    const attempt = await sendEnvelope(hook, String(row.event), envelope);
    const attemptedAt = new Date().toISOString();
    const exhausted = !attempt.succeeded && attempts >= MAX_ATTEMPTS;
    const nextAttemptAt = attempt.succeeded || exhausted ? null : retryTimestamp(attempts);

    await admin
      .from("webhook_deliveries")
      .update({
        status: attempt.succeeded ? "delivered" : "failed",
        attempts,
        response_status: attempt.status,
        error: attempt.error,
        duration_ms: attempt.durationMs,
        delivered_at: attempt.succeeded ? attemptedAt : null,
        last_attempt_at: attemptedAt,
        next_attempt_at: nextAttemptAt,
        dead_lettered_at: exhausted ? attemptedAt : null,
      })
      .eq("id", row.id);

    await updateHookHealth(admin, hook, attempt.succeeded);
    if (attempt.succeeded) delivered += 1;
    if (exhausted) deadLettered += 1;
  }

  return { retried, delivered, deadLettered };
}

/** Reusable entry point for a deployment cron/scheduler. Never throws. */
export async function processDueWebhookRetries(
  limit = 10,
): Promise<{ retried: number; delivered: number; deadLettered: number }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await processDueWebhookRetriesWithAdmin(supabaseAdmin as any, limit);
  } catch (error) {
    console.error("[webhooks] retry processing failed", error);
    return { retried: 0, delivered: 0, deadLettered: 0 };
  }
}
