import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listIntegrationCapabilities,
  normalizeIntegrationProvider,
  prepareIntegrationAction,
} from "@/lib/integrations/agent-integration-runtime.server";

const SOCIAL_PROVIDERS = new Set([
  "instagram", "facebook", "tiktok", "linkedin", "youtube", "x", "twitter", "threads",
  "pinterest", "bluesky", "mastodon", "discord", "telegram", "postiz",
]);
const SOCIAL_READ_ACTIONS = new Set(["youtube:channel_read"]);
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}
function boundedLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 20);
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
function socialCapabilityKey(provider: unknown, action: unknown): string {
  return `${normalizeIntegrationProvider(provider)}:${cleanText(action, 120).toLowerCase()}`;
}

export const listSocialPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => ({ limit: Math.min(Math.max(Number(input.limit ?? 50) || 50, 1), 100) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: posts, error } = await sb.from("social_posts")
      .select("id,title,content,campaign,labels,media,metadata,status,scheduled_for,published_at,created_at,updated_at,social_post_targets(id,provider,action,status,published_at,published_url,last_error,metrics)")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return posts ?? [];
  });

export const createSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title?: string; content: string; campaign?: string; labels?: string[]; media?: unknown; metadata?: unknown; scheduledFor?: string | null }) => {
    const content = cleanText(input?.content, 20_000);
    if (!content) throw new Error("Post content is required.");
    const media = Array.isArray(input?.media) ? input.media.slice(0, 20) : [];
    const metadata = record(input?.metadata);
    assertSecretFree(media, "media");
    return {
      title: cleanText(input?.title, 200), content, campaign: cleanText(input?.campaign, 120) || null,
      labels: boundedLabels(input?.labels), media, metadata, scheduledFor: isoOrNull(input?.scheduledFor),
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: created, error } = await sb.from("social_posts").insert({
      user_id: context.userId, title: data.title, content: data.content, campaign: data.campaign,
      labels: data.labels, media: data.media, metadata: data.metadata,
      status: data.scheduledFor ? "scheduled" : "draft", scheduled_for: data.scheduledFor,
    }).select("*").single();
    if (error) throw error;
    return created;
  });

export const rescheduleSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; scheduledFor?: string | null }) => ({ postId: postId(input?.postId), scheduledFor: isoOrNull(input?.scheduledFor) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: updated, error } = await sb.from("social_posts").update({
      scheduled_for: data.scheduledFor, status: data.scheduledFor ? "scheduled" : "draft", updated_at: new Date().toISOString(),
    }).eq("id", data.postId).eq("user_id", context.userId).in("status", ["draft", "scheduled", "failed", "cancelled"]).select("*").single();
    if (error) throw error;
    return updated;
  });

/** Publish/mutation capabilities only. Read-only social capabilities remain global for agents/workflows. */
export const listLiveSocialCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const capabilities = await listIntegrationCapabilities(context.userId);
    return capabilities
      .filter((item) => SOCIAL_PROVIDERS.has(normalizeIntegrationProvider(item.provider)))
      .filter((item) => !SOCIAL_READ_ACTIONS.has(socialCapabilityKey(item.provider, item.action)))
      .map((item) => ({
        provider: normalizeIntegrationProvider(item.provider), action: item.action, description: item.description,
        risk: item.risk, requiresApproval: item.requiresApproval, deployed: item.deployed, transport: item.transport, lane: item.lane,
      }));
  });

export const listNativeMetaSocialAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { discoverMetaAssets } = await import("@/lib/integrations/meta-social.server");
    const assets = await discoverMetaAssets(context.userId);
    return assets.map((asset) => ({
      pageId: String(asset.id), pageName: String(asset.name),
      tasks: Array.isArray(asset.tasks) ? asset.tasks.map((task) => String(task)).slice(0, 30) : [],
      instagram: asset.instagramAccount ? {
        id: String(asset.instagramAccount.id), username: asset.instagramAccount.username ? String(asset.instagramAccount.username) : null,
        name: asset.instagramAccount.name ? String(asset.instagramAccount.name) : null,
        profilePictureUrl: asset.instagramAccount.profilePictureUrl ? String(asset.instagramAccount.profilePictureUrl) : null,
      } : null,
    }));
  });

export const listNativeYouTubeChannels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { discoverYouTubeChannels } = await import("@/lib/integrations/youtube-social.server");
    const channels = await discoverYouTubeChannels(context.userId);
    return channels.map((channel) => ({
      id: String(channel.id), title: String(channel.title), description: String(channel.description).slice(0, 2000),
      customUrl: channel.customUrl ? String(channel.customUrl) : null, thumbnailUrl: channel.thumbnailUrl ? String(channel.thumbnailUrl) : null,
      subscriberCount: channel.subscriberCount ? String(channel.subscriberCount) : null,
      videoCount: channel.videoCount ? String(channel.videoCount) : null, viewCount: channel.viewCount ? String(channel.viewCount) : null,
    }));
  });

export const listNativePinterestBoards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { discoverPinterestBoards } = await import("@/lib/integrations/pinterest-social.server");
    const boards = await discoverPinterestBoards(context.userId);
    return boards.map((board) => ({
      id: String(board.id), name: String(board.name), description: String(board.description).slice(0, 2000),
      privacy: board.privacy ? String(board.privacy) : null,
      pinCount: typeof board.pinCount === "number" ? board.pinCount : null,
      followerCount: typeof board.followerCount === "number" ? board.followerCount : null,
    }));
  });

/** Safe creator controls required by TikTok before every Direct Post. */
export const getNativeTikTokCreatorInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { queryTikTokCreatorInfo } = await import("@/lib/integrations/tiktok-social.server");
    const creator = await queryTikTokCreatorInfo(context.userId);
    return {
      username: creator.username ? String(creator.username) : null,
      nickname: creator.nickname ? String(creator.nickname) : null,
      avatarUrl: creator.avatarUrl ? String(creator.avatarUrl) : null,
      privacyLevelOptions: creator.privacyLevelOptions.map((value) => String(value)).slice(0, 8),
      commentDisabled: creator.commentDisabled === true,
      duetDisabled: creator.duetDisabled === true,
      stitchDisabled: creator.stitchDisabled === true,
      maxVideoPostDurationSec: typeof creator.maxVideoPostDurationSec === "number" ? creator.maxVideoPostDurationSec : null,
    };
  });

export const addSocialPostTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; provider: string; action: string; actionInput?: Record<string, unknown> }) => {
    const provider = normalizeIntegrationProvider(input?.provider);
    if (!SOCIAL_PROVIDERS.has(provider)) throw new Error("This provider is not a supported social destination.");
    const action = cleanText(input?.action, 120).toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.:-]{0,119}$/.test(action)) throw new Error("A valid integration action is required.");
    if (SOCIAL_READ_ACTIONS.has(`${provider}:${action}`)) throw new Error("Read-only social capabilities cannot be attached as publishing destinations.");
    return { postId: postId(input?.postId), provider, action, actionInput: record(input?.actionInput) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: post, error: postError } = await sb.from("social_posts").select("id,content,title,media,metadata")
      .eq("id", data.postId).eq("user_id", context.userId).single();
    if (postError || !post) throw postError ?? new Error("Social post not found.");

    let actionInput = data.actionInput;
    if (data.provider === "facebook" && data.action === "facebook_page_post") {
      actionInput = { ...data.actionInput, message: cleanText(post.content, 20_000) };
    } else if (data.provider === "pinterest" && data.action === "pinterest_image_pin") {
      actionInput = {
        ...data.actionInput,
        description: cleanText(post.content, 500),
        ...(cleanText(post.title, 100) ? { title: cleanText(post.title, 100) } : {}),
      };
    } else if (data.provider === "tiktok" && data.action === "tiktok_photo_post") {
      actionInput = {
        ...data.actionInput,
        description: cleanText(post.content, 4000),
        ...(cleanText(post.title, 90) ? { title: cleanText(post.title, 90) } : {}),
      };
    }

    const prepared = await prepareIntegrationAction({
      userId: context.userId, provider: data.provider, action: data.action, actionInput,
    });

    const { data: target, error } = await sb.from("social_post_targets").upsert({
      post_id: data.postId, user_id: context.userId, provider: prepared.provider, action: prepared.action,
      action_input: prepared.input, transport: prepared.transport,
      status: prepared.requiresApproval ? "approval_required" : "pending", updated_at: new Date().toISOString(),
    }, { onConflict: "post_id,provider,action" })
      .select("id,post_id,provider,action,transport,status,published_at,published_url,last_error,metrics,created_at,updated_at").single();
    if (error) throw error;
    return {
      target,
      capability: {
        provider: prepared.provider, action: prepared.action, description: prepared.description, risk: prepared.risk,
        requiresApproval: prepared.requiresApproval, transport: prepared.transport, lane: prepared.lane,
      },
    };
  });
