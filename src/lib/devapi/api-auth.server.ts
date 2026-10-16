/**
 * Authentication, plan-based rate limiting and logging for the public
 * developer API (`/api/public/v1/*`).
 *
 * Nothing here trusts the caller: the identity comes from the SHA-256 hash of
 * the presented bearer key, the plan comes from `subscriptions`, and the
 * quotas are counted from `api_request_logs` rows written by this module.
 */
import { apiLimitsFor, type ApiPlanLimits } from "./plans";
import { sha256Hex } from "./keys.server";

export type ApiCallerContext = {
  userId: string;
  orgId: string | null;
  keyId: string;
  keyName: string;
  scopes: string[];
  planCode: string;
  limits: ApiPlanLimits;
  admin: any;
  keyHash: string;
  requestLogId?: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return json({ error: { code, message, ...extra } }, status);
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (match?.[1]) return match[1].trim();
  const alt = request.headers.get("x-api-key");
  return alt ? alt.trim() : null;
}

async function resolvePlan(admin: any, userId: string, orgId: string | null): Promise<string> {
  const query = admin
    .from("subscriptions")
    .select("plan_code,status,updated_at")
    .in("status", ["trialing", "active", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1);
  const { data, error } = orgId
    ? await query.eq("org_id", orgId)
    : await query.is("org_id", null).eq("user_id", userId);
  if (error) throw backendUnavailable();
  return (data?.[0]?.plan_code as string) ?? "explorer";
}

function backendUnavailable() {
  return new ApiError(503, "api_backend_unavailable", "API authorization storage is unavailable. Try again later.");
}

/** Verifies the bearer key and enforces scope + plan quotas. Throws ApiError. */
export async function authenticateApiRequest(
  request: Request,
  options: { scope: string; execution?: boolean },
): Promise<ApiCallerContext> {
  const presented = bearer(request);
  if (!presented) {
    throw new ApiError(
      401,
      "missing_api_key",
      "Provide your API key as `Authorization: Bearer pk_live_...`.",
    );
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin: any = supabaseAdmin;

  const hash = await sha256Hex(presented);
  const { data: key, error: keyError } = await admin
    .from("api_keys")
    .select("id,user_id,org_id,name,scopes,revoked_at,expires_at,environment")
    .eq("key_hash", hash)
    .maybeSingle();
  if (keyError) throw backendUnavailable();

  if (!key) throw new ApiError(401, "invalid_api_key", "This API key is not recognised.");
  if (key.revoked_at) throw new ApiError(401, "revoked_api_key", "This API key has been revoked.");
  if (key.expires_at && (!Number.isFinite(Date.parse(key.expires_at)) || Date.parse(key.expires_at) <= Date.now())) {
    throw new ApiError(401, "expired_api_key", "This API key has expired.");
  }

  const scopes: string[] = Array.isArray(key.scopes) ? key.scopes : [];
  if (!scopes.includes(options.scope)) {
    throw new ApiError(
      403,
      "insufficient_scope",
      `This key is missing the \`${options.scope}\` scope.`,
      {
        required_scope: options.scope,
      },
    );
  }

  const planCode = await resolvePlan(admin, key.user_id, key.org_id ?? null);
  const limits = apiLimitsFor(planCode);

  if (options.execution && !limits.execution) {
    throw new ApiError(
      403,
      "plan_execution_disabled",
      `The ${limits.label} plan does not include the execution API. Upgrade to Builder or above.`,
      {
        plan: planCode,
      },
    );
  }

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const [minuteResult, dayResult] = await Promise.all([
    admin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", key.user_id)
      .gte("created_at", minuteAgo),
    admin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", key.user_id)
      .gte("created_at", dayAgo),
  ]);
  if (minuteResult.error || dayResult.error || !Number.isSafeInteger(minuteResult.count) || !Number.isSafeInteger(dayResult.count)) throw backendUnavailable();
  const minuteCount = minuteResult.count;
  const dayCount = dayResult.count;

  if ((minuteCount ?? 0) >= limits.requestsPerMinute) {
    throw new ApiError(
      429,
      "rate_limit_exceeded",
      `Rate limit of ${limits.requestsPerMinute} requests/minute for the ${limits.label} plan was exceeded.`,
      {
        limit: limits.requestsPerMinute,
        window: "1m",
        plan: planCode,
      },
    );
  }
  if ((dayCount ?? 0) >= limits.requestsPerDay) {
    throw new ApiError(
      429,
      "daily_quota_exceeded",
      `Daily quota of ${limits.requestsPerDay} requests for the ${limits.label} plan was exceeded.`,
      {
        limit: limits.requestsPerDay,
        window: "24h",
        plan: planCode,
      },
    );
  }

  if (options.execution) {
    const { count: execCount, error: execError } = await admin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", key.user_id)
      .eq("is_execution", true)
      .gte("created_at", dayAgo);
    if (execError || !Number.isSafeInteger(execCount)) throw backendUnavailable();
    if ((execCount ?? 0) >= limits.executionsPerDay) {
      throw new ApiError(
        429,
        "execution_quota_exceeded",
        `Daily execution quota of ${limits.executionsPerDay} runs for the ${limits.label} plan was exceeded.`,
        {
          limit: limits.executionsPerDay,
          plan: planCode,
        },
      );
    }
  }

  return {
    userId: key.user_id,
    orgId: key.org_id ?? null,
    keyId: key.id,
    keyName: key.name,
    scopes,
    planCode,
    limits,
    admin,
    keyHash: hash,
  };
}

async function logRequest(args: {
  admin: any;
  request: Request;
  path: string;
  status: number;
  startedAt: number;
  ctx?: ApiCallerContext | null;
  error?: string | null;
}) {
  const { admin, request, ctx } = args;
  if (!ctx) return;
  try {
    const { error } = await admin.from("api_request_logs").update({
      status_code: args.status,
      duration_ms: Date.now() - args.startedAt,
      ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
      error: args.error ?? null,
    }).eq("id", ctx.requestLogId).eq("user_id", ctx.userId);
    if (error) console.error("[devapi] request completion telemetry unavailable");
  } catch (error) {
    console.error("[devapi] failed to log request", error);
  }
}

/**
 * Wraps a public API handler: authenticates, enforces quotas, serialises the
 * result and records the request in the audit log.
 */
export function withApiAuth(
  options: { scope: string; execution?: boolean; path: string },
  handler: (ctx: ApiCallerContext, request: Request, params: any) => Promise<unknown>,
) {
  return async ({ request, params }: { request: Request; params?: any }) => {
    const startedAt = Date.now();
    let ctx: ApiCallerContext | null = null;
    try {
      ctx = await authenticateApiRequest(request, options);
      // Reserve quota before effects. A failed completion update leaves status=0,
      // still counted; never report a completed POST as retryable because logging failed.
      const { data: receipt, error: reservationError } = await ctx.admin.rpc("reserve_developer_api_request", {
        p_user_id: ctx.userId, p_key_id: ctx.keyId, p_hash: ctx.keyHash,
        p_scope: options.scope, p_method: request.method, p_path: options.path,
        p_plan: ctx.planCode, p_minute: ctx.limits.requestsPerMinute,
        p_day: ctx.limits.requestsPerDay, p_execution_limit: ctx.limits.executionsPerDay,
        p_execution: Boolean(options.execution),
      });
      if (reservationError || !receipt || (!receipt.id && !receipt.error)) throw backendUnavailable();
      if (receipt.error) {
        if (receipt.error === "invalid_api_key") throw new ApiError(401, "invalid_api_key", "This API key is no longer active.");
        if (!["rate_limit_exceeded", "daily_quota_exceeded", "execution_quota_exceeded"].includes(receipt.error)) throw backendUnavailable();
        throw new ApiError(429, receipt.error, "The API request quota was exceeded.");
      }
      ctx.requestLogId = receipt.id;
      const result = await handler(ctx, request, params ?? {});
      const status = request.method === "POST" ? 201 : 200;
      const headers = {
        "x-ratelimit-limit": String(ctx.limits.requestsPerMinute),
        "x-palladium-plan": ctx.planCode,
      };
      await logRequest({ admin: ctx.admin, request, path: options.path, status, startedAt, ctx });
      return json({ data: result }, status, headers);
    } catch (error) {
      const isApiError = error instanceof ApiError;
      const status = isApiError ? error.status : 500;
      const code = isApiError ? error.code : "internal_error";
      const message = isApiError ? error.message : "The request could not be completed.";
      if (!isApiError) console.error("[devapi]", options.path, error);
      if (ctx?.requestLogId) {
        await logRequest({
          admin: ctx.admin,
          request,
          path: options.path,
          status,
          startedAt,
          ctx,
          error: message,
        });
      }
      return apiError(status, code, message, isApiError ? error.extra : {});
    }
  };
}

/** Parses and shallow-validates a JSON body. */
export async function readJson(request: Request): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("bad");
    return body as Record<string, any>;
  } catch {
    throw new ApiError(400, "invalid_body", "The request body must be a JSON object.");
  }
}

export function requireString(body: Record<string, any>, field: string, max = 4000): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(
      400,
      "invalid_request",
      `\`${field}\` is required and must be a non-empty string.`,
    );
  }
  if (value.length > max)
    throw new ApiError(400, "invalid_request", `\`${field}\` must be ${max} characters or fewer.`);
  return value.trim();
}

export function pageParams(request: Request): { limit: number; offset: number } {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25) || 25, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  return { limit, offset };
}

/** Scopes a select to the caller's tenancy. */
export function scoped(query: any, ctx: ApiCallerContext, orgColumn = "org_id") {
  return ctx.orgId ? query.eq(orgColumn, ctx.orgId) : query.eq("user_id", ctx.userId);
}
