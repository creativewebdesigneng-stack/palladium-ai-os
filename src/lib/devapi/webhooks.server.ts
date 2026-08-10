/**
 * Outbound webhook dispatch.
 *
 * Every delivery is authenticated: the body is signed with the subscriber's
 * signing secret (HMAC-SHA256) and sent with a timestamp so receivers can
 * reject replays. Deliveries are recorded for the developer portal.
 */
import { hmacSha256Hex } from './keys.server';
import type { WebhookEvent } from './plans';

const TIMEOUT_MS = 8000;

type DispatchArgs = {
  userId: string;
  orgId?: string | null;
  event: WebhookEvent | string;
  payload: Record<string, unknown>;
};

/** Sends an event to every active webhook subscribed to it. Never throws. */
export async function dispatchWebhookEvent(args: DispatchArgs): Promise<{ delivered: number }> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const admin: any = supabaseAdmin;

    const query = admin
      .from('webhooks')
      .select('id,url,events,signing_secret,is_active,user_id,org_id,failure_count')
      .eq('is_active', true)
      .contains('events', [args.event]);

    const { data: hooks } = args.orgId
      ? await query.eq('org_id', args.orgId)
      : await query.eq('user_id', args.userId);

    if (!hooks?.length) return { delivered: 0 };

    let delivered = 0;
    for (const hook of hooks) {
      const ok = await deliver(admin, hook, args);
      if (ok) delivered += 1;
    }
    return { delivered };
  } catch (error) {
    console.error('[webhooks] dispatch failed', error);
    return { delivered: 0 };
  }
}

async function deliver(admin: any, hook: any, args: DispatchArgs): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const envelope = {
    id: crypto.randomUUID(),
    event: args.event,
    created_at: new Date().toISOString(),
    data: args.payload,
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
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'PalladiumAI-Webhooks/1.0',
        'x-palladium-event': String(args.event),
        'x-palladium-timestamp': String(timestamp),
        ...(signature ? { 'x-palladium-signature': `v1=${signature}` } : {}),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    status = res.status;
    if (!res.ok) error = `Endpoint responded ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Delivery failed';
  }

  const succeeded = status !== null && status >= 200 && status < 300;

  await admin.from('webhook_deliveries').insert({
    webhook_id: hook.id,
    user_id: hook.user_id,
    org_id: hook.org_id ?? null,
    event: args.event,
    payload: envelope,
    status: succeeded ? 'delivered' : 'failed',
    attempts: 1,
    response_status: status,
    error,
    duration_ms: Date.now() - startedAt,
    delivered_at: succeeded ? new Date().toISOString() : null,
  });

  await admin
    .from('webhooks')
    .update({
      last_delivery_at: new Date().toISOString(),
      delivery_count: (Number(hook.delivery_count) || 0) + 1,
      failure_count: succeeded ? 0 : (Number(hook.failure_count) || 0) + 1,
      is_active: !succeeded && (Number(hook.failure_count) || 0) + 1 >= 20 ? false : true,
    })
    .eq('id', hook.id);

  return succeeded;
}
