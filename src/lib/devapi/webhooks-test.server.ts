/**
 * Test delivery helper. Sends a signed `ping` event to a single endpoint so
 * developers can verify signature handling before going live.
 */
import { hmacSha256Hex } from "./keys.server";

export async function sendTestDelivery(webhookId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin: any = supabaseAdmin;

  const { data: hook } = await admin
    .from("webhooks")
    .select("id,url,user_id,org_id,signing_secret,delivery_count")
    .eq("id", webhookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!hook) throw new Error("That webhook no longer exists.");

  const timestamp = Math.floor(Date.now() / 1000);
  const envelope = {
    id: crypto.randomUUID(),
    event: "ping",
    created_at: new Date().toISOString(),
    data: { message: "Test delivery from PalladiumAI" },
  };
  const body = JSON.stringify(envelope);
  const signature = hook.signing_secret
    ? await hmacSha256Hex(hook.signing_secret, `${timestamp}.${body}`)
    : null;

  const startedAt = Date.now();
  let status: number | null = null;
  let error: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-palladium-event": "ping",
        "x-palladium-timestamp": String(timestamp),
        ...(signature ? { "x-palladium-signature": `v1=${signature}` } : {}),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    status = res.status;
    if (!res.ok) error = `Endpoint responded ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Delivery failed";
  }

  const succeeded = status !== null && status >= 200 && status < 300;
  await admin.from("webhook_deliveries").insert({
    webhook_id: hook.id,
    user_id: hook.user_id,
    org_id: hook.org_id ?? null,
    event: "ping",
    payload: envelope,
    status: succeeded ? "delivered" : "failed",
    attempts: 1,
    response_status: status,
    error,
    duration_ms: Date.now() - startedAt,
    delivered_at: succeeded ? new Date().toISOString() : null,
  });
  await admin
    .from("webhooks")
    .update({
      last_delivery_at: new Date().toISOString(),
      delivery_count: (Number(hook.delivery_count) || 0) + 1,
    })
    .eq("id", hook.id);

  return { delivered: succeeded, last_response_status: status, error };
}
