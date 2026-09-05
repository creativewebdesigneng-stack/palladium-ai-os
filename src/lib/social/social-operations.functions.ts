import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  executeIntegrationAction,
  listIntegrationCapabilities,
  normalizeIntegrationProvider,
  prepareIntegrationAction,
  type IntegrationCapability,
} from "@/lib/integrations/agent-integration-runtime.server";

const SOCIAL_PROVIDERS = new Set([
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "twitter",
  "threads",
  "pinterest",
  "bluesky",
  "mastodon",
  "discord",
  "telegram",
  "postiz",
]);
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;
const PUBLISH_ID_KEYS = new Set(["publishid", "publish_id", "postid", "post_id", "videoid", "video_id"]);
const STATUS_KEYS = new Set(["status", "statuscode", "status_code", "publishstatus", "publish_status", "poststatus", "post_status"]);

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

function boundedLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => cleanText(item, 40))
    .filter(Boolean)
    .slice(0, 20);
}

function assertSecretFree(value: unknown, path = "input", depth = 0): void {
  if (depth > 8) throw new Error(`${path} is too deeply nested.`);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error(`${path} is too large.`);
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`, depth + 1));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) throw new Error(`Credential-like field "${key}" is not allowed in social content data.`);
    assertSecretFree(child, `${path}.${key}`, depth + 1);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  assertSecretFree(value);
  return value as Record<string, unknown>;
}

function untrustedRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isoOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = cleanText(value, 80);
  const time = Date.parse(raw);
  if (!raw || Number.isNaN(time)) throw new Error("scheduledFor must be a valid date/time.");
  return new Date(time).toISOString();
}

function postId(value: unknown): string {
  const id = cleanText(value, 60);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("A valid social post ID is required.");
  return id;
}

function targetId(value: unknown): string {
  const id = cleanText(value, 60);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("A valid social target ID is required.");
  return id;
}

function deepValue(value: unknown, keys: Set<string>, depth = 0): string | null {
  if (depth > 6 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 25)) {
      const found = deepValue(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
    if (keys.has(normalized) || keys.has(normalized.replace(/_/g, ""))) {
      if (typeof child === "string" || typeof child === "number") {
        const found = String(child).trim();
        if (found) return found.slice(0, 500);
      }
    }
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = deepValue(child, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

function mappedPublishStatus(value: unknown): "published" | "failed" | "publishing" | null {
  const raw = deepValue(value, STATUS_KEYS);
  if (!raw) return null;
  const status = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (/PUBLISH_COMPLETE|PUBLISHED|SUCCESS|SUCCEEDED|COMPLETED|COMPLETE/.test(status)) return "published";
  if (/FAILED|FAILURE|ERROR|REJECTED/.test(status)) return "failed";
  if (/PROCESS|PENDING|UPLOAD|DOWNLOAD|QUEUED|SUBMIT/.test(status)) return "publishing";
  return null;
}

function schemaProperties(capability: IntegrationCapability): Record<string, unknown> {
  return untrustedRecord(untrustedRecord(capability.inputSchema)["properties"]);
}

function tiktokStatusCapability(capabilities: IntegrationCapability[]): IntegrationCapability | null {
  const scored = capabilities
    .filter((item) => normalizeIntegrationProvider(item.provider) === "tiktok")
    .map((item) => {
      const haystack = `${item.action} ${item.description}`.toLowerCase();
      let score = 0;
      if (/status/.test(haystack)) score += 8;
      if (/query|check|fetch|get/.test(haystack)) score += 4;
      if (/publish|post|video/.test(haystack)) score += 3;
      if (item.requiresApproval) score -= 20;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.item ?? null;
}

function statusActionInput(capability: IntegrationCapability, providerPostId: string): Record<string, unknown> {
  const properties = schemaProperties(capability);
  const candidates = ["publishId", "publish_id", "postId", "post_id", "videoId", "video_id"];
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) return { [key]: providerPostId };
  }
  return { publishId: providerPostId };
}

async function approvalForTarget(sb: any, userId: string, approvalRequestId: string | null) {
  if (!approvalRequestId) return null;
  const { data, error } = await sb
    .from("approval_requests")
    .select("id,status,execution_status,execution_error,execution_result")
    .eq("id", approvalRequestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function reconcileSocialTarget(sb: any, userId: string, target: any): Promise<any> {
  if (!target?.id) return target;
  let status = String(target.status ?? "");
  let providerPostId = typeof target.provider_post_id === "string" ? target.provider_post_id : null;
  let lastError = typeof target.last_error === "string" ? target.last_error : null;
  let metrics = untrustedRecord(target.metrics);

  if (target.approval_request_id && ["approval_required", "pending", "publishing"].includes(status)) {
    const approval = await approvalForTarget(sb, userId, target.approval_request_id);
    if (approval?.status === "rejected") {
      status = "failed";
      lastError = "Publishing approval was rejected.";
    } else if (approval?.execution_status === "failed") {
      status = "failed";
      lastError = cleanText(approval.execution_error, 1000) || "Approved social publish failed.";
    } else if (approval?.execution_status === "succeeded") {
      providerPostId = providerPostId ?? deepValue(approval.execution_result, PUBLISH_ID_KEYS);
      status = providerPostId ? "publishing" : "published";
      metrics = {
        ...metrics,
        approval_execution_result: untrustedRecord(approval.execution_result),
      };
    }
  }

  if (normalizeIntegrationProvider(target.provider) === "tiktok" && providerPostId && status === "publishing") {
    const capabilities = await listIntegrationCapabilities(userId, "tiktok");
    const capability = tiktokStatusCapability(capabilities);
    if (capability && !capability.requiresApproval) {
      const prepared = await prepareIntegrationAction({
        userId,
        provider: "tiktok",
        action: capability.action,
        actionInput: statusActionInput(capability, providerPostId),
      });
      const execution = await executeIntegrationAction({
        userId,
        provider: prepared.provider,
        action: prepared.action,
        actionInput: prepared.input,
        transport: prepared.transport,
      });
      if (execution.ok) {
        const mapped = mappedPublishStatus(execution.result);
        status = mapped ?? "publishing";
        lastError = null;
        metrics = {
          ...metrics,
          publish_status: execution.result ?? null,
          publish_status_checked_at: new Date().toISOString(),
        };
      } else {
        lastError = cleanText(execution.error, 1000) || lastError;
      }
    }
  }

  const publishedAt = status === "published" ? (target.published_at ?? new Date().toISOString()) : target.published_at ?? null;
  const changed =
    status !== target.status ||
    providerPostId !== (target.provider_post_id ?? null) ||
    lastError !== (target.last_error ?? null) ||
    publishedAt !== (target.published_at ?? null) ||
    JSON.stringify(metrics) !== JSON.stringify(untrustedRecord(target.metrics));

  if (!changed) return { ...target, provider_post_id: providerPostId };
  const { data: updated, error } = await sb
    .from("social_post_targets")
    .update({
      status,
      provider_post_id: providerPostId,
      published_at: publishedAt,
      last_error: lastError,
      metrics,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq("user_id", userId)
    .select("id,post_id,provider,action,transport,status,approval_request_id,provider_post_id,published_at,published_url,last_error,metrics,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  return updated ?? target;
}

export const listSocialPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => ({
    limit: Math.min(Math.max(Number(input.limit ?? 50) || 50, 1), 100),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: posts, error } = await sb
      .from("social_posts")
      .select("id,title,content,campaign,labels,media,metadata,status,scheduled_for,published_at,created_at,updated_at,social_post_targets(id,provider,action,transport,status,approval_request_id,provider_post_id,published_at,published_url,last_error,metrics)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;

    for (const post of posts ?? []) {
      if (!Array.isArray(post.social_post_targets)) continue;
      post.social_post_targets = await Promise.all(
        post.social_post_targets.map((target: any) => reconcileSocialTarget(sb, context.userId, target)),
      );
    }
    return posts ?? [];
  });

export const createSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    title?: string;
    content: string;
    campaign?: string;
    labels?: string[];
    media?: unknown;
    metadata?: unknown;
    scheduledFor?: string | null;
  }) => {
    const content = cleanText(input?.content, 20_000);
    if (!content) throw new Error("Post content is required.");
    const media = Array.isArray(input?.media) ? input.media.slice(0, 20) : [];
    const metadata = record(input?.metadata);
    assertSecretFree(media, "media");
    const scheduledFor = isoOrNull(input?.scheduledFor);
    return {
      title: cleanText(input?.title, 200),
      content,
      campaign: cleanText(input?.campaign, 120) || null,
      labels: boundedLabels(input?.labels),
      media,
      metadata,
      scheduledFor,
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: created, error } = await sb
      .from("social_posts")
      .insert({
        user_id: context.userId,
        title: data.title,
        content: data.content,
        campaign: data.campaign,
        labels: data.labels,
        media: data.media,
        metadata: data.metadata,
        status: data.scheduledFor ? "scheduled" : "draft",
        scheduled_for: data.scheduledFor,
      })
      .select("*")
      .single();
    if (error) throw error;
    return created;
  });

export const rescheduleSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; scheduledFor?: string | null }) => ({
    postId: postId(input?.postId),
    scheduledFor: isoOrNull(input?.scheduledFor),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: updated, error } = await sb
      .from("social_posts")
      .update({
        scheduled_for: data.scheduledFor,
        status: data.scheduledFor ? "scheduled" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .in("status", ["draft", "scheduled", "failed", "cancelled"])
      .select("*")
      .single();
    if (error) throw error;
    return updated;
  });

export const listLiveSocialCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const capabilities = await listIntegrationCapabilities(context.userId);
    return capabilities
      .filter((item) => SOCIAL_PROVIDERS.has(normalizeIntegrationProvider(item.provider)))
      .map((item) => ({
        provider: normalizeIntegrationProvider(item.provider),
        action: item.action,
        description: item.description,
        risk: item.risk,
        requiresApproval: item.requiresApproval,
        deployed: item.deployed,
        transport: item.transport,
        lane: item.lane,
      }));
  });

export const addSocialPostTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    postId: string;
    provider: string;
    action: string;
    actionInput?: Record<string, unknown>;
  }) => {
    const provider = normalizeIntegrationProvider(input?.provider);
    if (!SOCIAL_PROVIDERS.has(provider)) throw new Error("This provider is not a supported social destination.");
    const action = cleanText(input?.action, 120).toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.:-]{0,119}$/.test(action)) throw new Error("A valid integration action is required.");
    const actionInput = record(input?.actionInput);
    return { postId: postId(input?.postId), provider, action, actionInput };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: post, error: postError } = await sb
      .from("social_posts")
      .select("id,content,title,media,metadata")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .single();
    if (postError || !post) throw postError ?? new Error("Social post not found.");

    const prepared = await prepareIntegrationAction({
      userId: context.userId,
      provider: data.provider,
      action: data.action,
      actionInput: data.actionInput,
    });

    const { data: target, error } = await sb
      .from("social_post_targets")
      .upsert(
        {
          post_id: data.postId,
          user_id: context.userId,
          provider: prepared.provider,
          action: prepared.action,
          action_input: prepared.input,
          transport: prepared.transport,
          status: prepared.requiresApproval ? "approval_required" : "pending",
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "post_id,provider,action" },
      )
      .select("id,post_id,provider,action,transport,status,approval_request_id,provider_post_id,published_at,published_url,last_error,metrics,created_at,updated_at")
      .single();
    if (error) throw error;

    let linkedTarget = target;
    let approvalRequestId = target.approval_request_id ?? null;
    if (prepared.requiresApproval) {
      const existing = await approvalForTarget(sb, context.userId, approvalRequestId);
      if (!existing || existing.status !== "pending") {
        const { data: approval, error: approvalError } = await sb
          .from("approval_requests")
          .insert({
            user_id: context.userId,
            action_type: "nango_dynamic_action",
            title: `Publish ${post.title || "social post"} to ${prepared.provider}`.slice(0, 200),
            summary: `Approve publishing this Social Operations post through the connected ${prepared.provider} account.`.slice(0, 500),
            details: {
              provider: prepared.provider,
              action: prepared.action,
              input: prepared.input,
              transport: prepared.transport,
              social_post_target_id: target.id,
            },
            risk_level: prepared.risk,
            status: "pending",
          })
          .select("id")
          .single();
        if (approvalError || !approval?.id) {
          await sb
            .from("social_post_targets")
            .update({ status: "failed", last_error: "Could not create publishing approval request.", updated_at: new Date().toISOString() })
            .eq("id", target.id)
            .eq("user_id", context.userId);
          throw approvalError ?? new Error("Could not create publishing approval request.");
        }
        approvalRequestId = approval.id;
        const { data: updated, error: linkError } = await sb
          .from("social_post_targets")
          .update({ approval_request_id: approval.id, status: "approval_required", updated_at: new Date().toISOString() })
          .eq("id", target.id)
          .eq("user_id", context.userId)
          .select("id,post_id,provider,action,transport,status,approval_request_id,provider_post_id,published_at,published_url,last_error,metrics,created_at,updated_at")
          .single();
        if (linkError) {
          await sb
            .from("approval_requests")
            .update({ status: "expired", decided_at: new Date().toISOString(), decision_note: "The social publishing target could not be linked." })
            .eq("id", approval.id)
            .eq("user_id", context.userId)
            .eq("status", "pending");
          throw linkError;
        }
        linkedTarget = updated;
      }
    }

    return {
      target: linkedTarget,
      approvalRequestId,
      capability: {
        provider: prepared.provider,
        action: prepared.action,
        description: prepared.description,
        risk: prepared.risk,
        requiresApproval: prepared.requiresApproval,
        transport: prepared.transport,
        lane: prepared.lane,
      },
    };
  });

export const refreshSocialPostTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string }) => ({ targetId: targetId(input?.targetId) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: target, error } = await sb
      .from("social_post_targets")
      .select("id,post_id,provider,action,transport,status,approval_request_id,provider_post_id,published_at,published_url,last_error,metrics,created_at,updated_at")
      .eq("id", data.targetId)
      .eq("user_id", context.userId)
      .single();
    if (error || !target) throw error ?? new Error("Social publishing target not found.");
    return reconcileSocialTarget(sb, context.userId, target);
  });
