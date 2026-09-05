import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

export function bindNativeSocialActionInput(input: {
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  post: { content?: unknown; title?: unknown };
}): Record<string, unknown> {
  const { provider, action, actionInput, post } = input;
  if (provider === "facebook" && action === "facebook_page_post") {
    return { ...actionInput, message: cleanText(post.content, 20_000) };
  }
  if (provider === "instagram" && action === "instagram_image_post") {
    return {
      instagram_id: cleanText(actionInput["instagram_id"], 160),
      image_url: cleanText(actionInput["image_url"], 2000),
      caption: cleanText(post.content, 2200),
      ...(cleanText(actionInput["alt_text"], 1000) ? { alt_text: cleanText(actionInput["alt_text"], 1000) } : {}),
    };
  }
  if (provider === "pinterest" && action === "pinterest_image_pin") {
    return {
      ...actionInput,
      description: cleanText(post.content, 500),
      ...(cleanText(post.title, 100) ? { title: cleanText(post.title, 100) } : {}),
    };
  }
  if (provider === "tiktok" && action === "tiktok_photo_post") {
    return {
      ...actionInput,
      description: cleanText(post.content, 4000),
      ...(cleanText(post.title, 90) ? { title: cleanText(post.title, 90) } : {}),
    };
  }
  if (provider === "x" && action === "x_text_post") {
    return {
      text: cleanText(post.content, 10_000),
      made_with_ai: actionInput["made_with_ai"] === true,
      paid_partnership: actionInput["paid_partnership"] === true,
    };
  }
  if (provider === "threads" && action === "threads_text_post") {
    return { text: cleanText(post.content, 500) };
  }
  return actionInput;
}

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

export const getNativeTikTokPublishStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publishId: string }) => ({ publishId: cleanText(input?.publishId, 100) }))
  .handler(async ({ data, context }) => {
    const { fetchTikTokPublishStatus } = await import("@/lib/integrations/tiktok-social.server");
    const status = await fetchTikTokPublishStatus({ userId: context.userId, publishId: data.publishId });
    return {
      publishId: String(status.publishId), status: String(status.status),
      failReason: status.failReason ? String(status.failReason) : null,
      publiclyAvailablePostIds: status.publiclyAvailablePostIds.map((value) => String(value)).slice(0, 20),
      uploadedBytes: typeof status.uploadedBytes === "number" ? status.uploadedBytes : null,
      downloadedBytes: typeof status.downloadedBytes === "number" ? status.downloadedBytes : null,
    };
  });

export const getNativeXAccountInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { getXAccountInfo } = await import("@/lib/integrations/x-social.server");
    const account = await getXAccountInfo(context.userId);
    return {
      id: String(account.id), username: String(account.username), name: String(account.name),
      profileImageUrl: account.profileImageUrl ? String(account.profileImageUrl) : null,
      protected: account.protected === true, verified: account.verified === true,
    };
  });

export const getNativeThreadsAccountInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { getThreadsAccountInfo } = await import("@/lib/integrations/threads-social.server");
    const account = await getThreadsAccountInfo(context.userId);
    return {
      id: String(account.id), username: String(account.username),
      profilePictureUrl: account.profilePictureUrl ? String(account.profilePictureUrl) : null,
    };
  });
