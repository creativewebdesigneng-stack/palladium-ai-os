/**
 * Developer platform API (typed RPC for the portal UI).
 *
 * Raw key material is generated server-side, hashed before storage and
 * returned exactly once. Every function is authenticated and scoped to the
 * caller.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { apiLimitsFor, API_SCOPES, WEBHOOK_EVENT_TYPES } from "./plans";
import { generateApiKey, generateWebhookSecret, maskKey } from "./keys.server";

type Sb = { from: (t: string) => any };

const SCOPES = new Set<string>(API_SCOPES as unknown as string[]);
const EVENTS = new Set<string>(WEBHOOK_EVENT_TYPES as unknown as string[]);

async function resolvePlan(sb: Sb, userId: string) {
  const { data } = await sb
    .from("subscriptions")
    .select("plan_code,status,org_id")
    .in("status", ["trialing", "active", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1);
  return (data?.[0]?.plan_code as string) ?? "explorer";
}

const KEY_COLUMNS =
  "id,name,environment,key_prefix,last_four,scopes,request_count,created_at,last_used_at,revoked_at,expires_at";

function shapeKey(row: any) {
  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  return {
    id: row.id,
    name: row.name,
    environment: row.environment ?? "live",
    status: row.revoked_at ? "revoked" : expired ? "expired" : "active",
    prefix: row.key_prefix,
    masked: maskKey(row.key_prefix ?? "pk_live", row.last_four ?? null),
    scopes: row.scopes ?? [],
    requests_count: Number(row.request_count ?? 0),
    created_date: row.created_at,
    last_used_date: row.last_used_at,
    expires_at: row.expires_at ?? null,
  };
}

/** Lists the caller's API keys (hashes are never returned). */
export const listApiKeysFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const planCode = await resolvePlan(sb, context.userId);
    const limits = apiLimitsFor(planCode);
    const { data } = await sb
      .from("api_keys")
      .select(KEY_COLUMNS)

      .order("created_at", { ascending: false });
    return {
      keys: (data ?? []).map(shapeKey),
      plan: { code: planCode, ...limits },
      scopes: Array.from(SCOPES),
    };
  });

/** Creates a key. The raw secret is returned once and never persisted. */
export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      environment?: string;
      scopes?: string[];
      expires_in_days?: number | null;
    }) => {
      const name = String(input?.name ?? "").trim();
      if (!name) throw new Error("Give the key a name.");
      const environment = input?.environment === "test" ? "test" : "live";
      const scopes = (input?.scopes ?? []).filter((s) => SCOPES.has(s));
      const days = Number(input?.expires_in_days ?? 0);
      const expiresInDays = Number.isFinite(days) && days > 0 ? Math.min(days, 730) : null;
      return {
        name: name.slice(0, 80),
        environment: environment as "live" | "test",
        scopes,
        expiresInDays,
      };
    },
  )

  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const planCode = await resolvePlan(sb, context.userId);
    const limits = apiLimitsFor(planCode);

    const { count } = await sb
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);
    if ((count ?? 0) >= limits.maxKeys) {
      throw new Error(
        `The ${limits.label} plan allows ${limits.maxKeys} active API key(s). Revoke one or upgrade.`,
      );
    }

    const generated = await generateApiKey(data.environment);
    const { data: row, error } = await sb
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        environment: data.environment,
        key_prefix: generated.prefix,
        last_four: generated.lastFour,
        key_hash: generated.hash,
        scopes: data.scopes.length ? data.scopes : ["agents:read", "tasks:read"],
        expires_at: data.expiresInDays
          ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString()
          : null,
      })
      .select(KEY_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    // The only time the raw key exists outside the caller's own machine.
    return { key: generated.raw, record: shapeKey(row) };
  });

/** Revokes the old key and issues a replacement in one step. */
export const rotateApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key_id: string }) => ({ key_id: String(input?.key_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: existing } = await sb
      .from("api_keys")
      .select("id,name,environment,scopes")
      .eq("id", data.key_id)
      .maybeSingle();
    if (!existing) throw new Error("That API key no longer exists.");

    const generated = await generateApiKey(
      (existing.environment === "test" ? "test" : "live") as "live" | "test",
    );
    const { data: row, error } = await sb
      .from("api_keys")
      .update({
        key_hash: generated.hash,
        key_prefix: generated.prefix,
        last_four: generated.lastFour,
        request_count: 0,
        last_used_at: null,
        revoked_at: null,
      })
      .eq("id", data.key_id)
      .select(KEY_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return { key: generated.raw, record: shapeKey(row) };
  });

/** Revokes a key immediately — the hash stops authenticating requests. */
export const revokeApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key_id: string }) => ({ key_id: String(input?.key_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.key_id);
    if (error) throw new Error(error.message);
    return { revoked: true };
  });

function shapeHook(row: any) {
  return {
    id: row.id,
    url: row.url,
    events: row.events ?? [],
    status: row.is_active ? "active" : "paused",
    description: row.name ?? "",
    secret: `${row.secret_prefix ?? "whsec_"}${"•".repeat(12)}`,
    deliveries_count: Number(row.delivery_count ?? 0),
    failure_count: Number(row.failure_count ?? 0),
    last_delivery_at: row.last_delivery_at,
  };
}

/** Webhook subscriptions plus recent delivery attempts. */
export const listWebhooksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: hooks }, { data: deliveries }] = await Promise.all([
      sb
        .from("webhooks")
        .select(
          "id,url,events,is_active,name,secret_prefix,delivery_count,failure_count,last_delivery_at,created_at",
        )
        .order("created_at", { ascending: false }),
      sb
        .from("webhook_deliveries")
        .select("id,webhook_id,event,status,response_status,error,duration_ms,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const lastStatus = new Map<string, number | null>();
    for (const d of deliveries ?? [])
      if (!lastStatus.has(d.webhook_id)) lastStatus.set(d.webhook_id, d.response_status);

    return {
      webhooks: (hooks ?? []).map((h: any) => ({
        ...shapeHook(h),
        last_response_status: lastStatus.get(h.id) ?? null,
      })),
      deliveries: deliveries ?? [],
      events: Array.from(EVENTS),
    };
  });

/** Creates a subscription and returns the signing secret once. */
export const createWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string; events?: string[]; description?: string }) => {
    const url = String(input?.url ?? "").trim();
    if (!/^https:\/\/.+/i.test(url) && !/^http:\/\/localhost/i.test(url)) {
      throw new Error("Webhook URLs must use HTTPS.");
    }
    const events = (input?.events ?? []).filter((e) => EVENTS.has(e));
    if (!events.length) throw new Error("Select at least one supported event.");
    return {
      url: url.slice(0, 500),
      events,
      description: String(input?.description ?? "").slice(0, 200),
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const planCode = await resolvePlan(sb, context.userId);
    const limits = apiLimitsFor(planCode);
    const { count } = await sb.from("webhooks").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= limits.maxWebhooks) {
      throw new Error(`The ${limits.label} plan allows ${limits.maxWebhooks} webhook(s).`);
    }

    const secret = await generateWebhookSecret();
    const { data: row, error } = await sb
      .from("webhooks")
      .insert({
        user_id: context.userId,
        url: data.url,
        events: data.events,
        name: data.description || null,
        secret_hash: secret.hash,
        secret_prefix: secret.prefix,
        signing_secret: secret.raw,
        is_active: true,
      })
      .select(
        "id,url,events,is_active,name,secret_prefix,delivery_count,failure_count,last_delivery_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return { secret: secret.raw, record: shapeHook(row) };
  });

/** Pauses, resumes or re-targets a webhook. */
export const updateWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { webhook_id: string; status?: string; events?: string[]; url?: string }) => ({
      webhook_id: String(input?.webhook_id ?? ""),
      status: input?.status === "paused" || input?.status === "active" ? input.status : undefined,
      events: input?.events?.filter((e) => EVENTS.has(e)),
      url: input?.url ? String(input.url).slice(0, 500) : undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const patch: Record<string, unknown> = {};
    if (data.status) patch["is_active"] = data.status === "active";
    if (data.events?.length) patch["events"] = data.events;
    if (data.url) patch["url"] = data.url;
    const { error } = await sb.from("webhooks").update(patch).eq("id", data.webhook_id);
    if (error) throw new Error(error.message);
    return { updated: true };
  });

export const deleteWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { webhook_id: string }) => ({
    webhook_id: String(input?.webhook_id ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("webhooks").delete().eq("id", data.webhook_id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });

/** Sends a signed test event to one of the caller's endpoints. */
export const testWebhookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { webhook_id: string }) => ({
    webhook_id: String(input?.webhook_id ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    // Ownership is proven by RLS before anything is dispatched.
    const { data: hook } = await sb
      .from("webhooks")
      .select("id,events")
      .eq("id", data.webhook_id)
      .maybeSingle();
    if (!hook) throw new Error("That webhook no longer exists.");

    const { sendTestDelivery } = await import("./webhooks-test.server");
    const result = await sendTestDelivery(hook.id, context.userId);
    return result;
  });

/** Aggregated API usage, top keys and the recent request log. */
export const getApiUsageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const planCode = await resolvePlan(sb, context.userId);
    const limits = apiLimitsFor(planCode);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [{ data: logs }, { data: keys }] = await Promise.all([
      sb
        .from("api_request_logs")
        .select("id,method,path,status_code,duration_ms,ip,created_at,api_key_id,error")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      sb.from("api_keys").select("id,name"),
    ]);

    const keyNames = new Map<string, string>((keys ?? []).map((k: any) => [k.id, k.name]));
    const rows = logs ?? [];
    const errors = rows.filter((r: any) => r.status_code >= 400).length;
    const latencies = rows.map((r: any) => Number(r.duration_ms) || 0).filter((n: number) => n > 0);

    // 24 hourly buckets, oldest first.
    const buckets = new Array(24).fill(0);
    const now = Date.now();
    for (const r of rows) {
      const hoursAgo = Math.floor((now - new Date(r.created_at).getTime()) / 3600_000);
      if (hoursAgo >= 0 && hoursAgo < 24) buckets[23 - hoursAgo] += 1;
    }

    const perKey = new Map<string, number>();
    for (const r of rows) {
      const name = keyNames.get(r.api_key_id) ?? "Unknown key";
      perKey.set(name, (perKey.get(name) ?? 0) + 1);
    }

    return {
      requests: rows.length,
      errors,
      error_rate: rows.length ? Number(((errors / rows.length) * 100).toFixed(1)) : 0,
      avg_latency_ms: latencies.length
        ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
        : 0,
      series: buckets,
      plan: { code: planCode, ...limits },
      top_keys: Array.from(perKey.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recent: rows.slice(0, 100).map((r: any) => ({
        t: new Date(r.created_at).toLocaleTimeString(),
        method: r.method,
        path: r.path,
        status: r.status_code,
        ms: Number(r.duration_ms) || 0,
        key: keyNames.get(r.api_key_id) ?? "—",
        ip: r.ip ?? "—",
        error: r.error ?? null,
      })),
    };
  });
