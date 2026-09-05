import {
  buildConnectedServiceRequest,
  type ConnectedServiceInput,
} from "./connected-service.server";
import {
  directConnectedServiceActions,
  executeDirectConnectedService,
  hasDirectConnectedService,
} from "./direct-connected-service.server";
import type { IntegrationAdapter } from "./integration-adapters.server";
import {
  TIKTOK_SOCIAL_ACTION,
  TIKTOK_SOCIAL_INPUT_SCHEMA,
  hasNativeTikTokConnection,
  prepareTikTokSocialAction,
} from "./tiktok-social-actions.server";
import { publishTikTokPhotoPost } from "./tiktok-social.server";
import {
  TIKTOK_VIDEO_ACTION,
  TIKTOK_VIDEO_INPUT_SCHEMA,
  prepareTikTokVideoAction,
} from "./tiktok-video-actions.server";
import { publishTikTokVideoPost } from "./tiktok-video.server";
import {
  YOUTUBE_VIDEO_ACTION,
  YOUTUBE_VIDEO_INPUT_SCHEMA,
  hasNativeYouTubeConnection,
  prepareYouTubeVideoAction,
} from "./youtube-video-actions.server";
import { uploadYouTubeVideo } from "./youtube-video.server";

const DIRECT_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    query: { type: "string", maxLength: 200 },
    resource_id: { type: "string", maxLength: 160 },
    limit: { type: "integer", minimum: 1, maximum: 25 },
  },
  additionalProperties: false,
};

function asDirectInput(provider: string, action: string, actionInput: Record<string, unknown>): ConnectedServiceInput {
  return {
    provider,
    action,
    ...(typeof actionInput["query"] === "string" ? { query: actionInput["query"] as string } : {}),
    ...(typeof actionInput["resource_id"] === "string" ? { resource_id: actionInput["resource_id"] as string } : {}),
    ...(typeof actionInput["limit"] === "number" ? { limit: actionInput["limit"] as number } : {}),
  };
}

export const trustedMediaVideoIntegrationAdapter: IntegrationAdapter = {
  id: "direct_oauth",
  lane: "direct_api",
  supportsProvider(provider) {
    return provider === "tiktok" || provider === "youtube";
  },
  async listCapabilities(userId, provider) {
    const rows = [];
    if ((!provider || provider === "tiktok") && await hasNativeTikTokConnection(userId)) {
      rows.push({
        provider: "tiktok", action: TIKTOK_SOCIAL_ACTION,
        description: "Publish an approved photo to TikTok through Direct Post.", risk: "medium" as const,
        requiresApproval: true, deployed: true, inputSchema: TIKTOK_SOCIAL_INPUT_SCHEMA,
      });
      rows.push({
        provider: "tiktok", action: TIKTOK_VIDEO_ACTION,
        description: "Publish an approved verified MP4 video to TikTok through Direct Post FILE_UPLOAD.", risk: "medium" as const,
        requiresApproval: true, deployed: true, inputSchema: TIKTOK_VIDEO_INPUT_SCHEMA,
      });
    }
    if ((!provider || provider === "youtube") && await hasNativeYouTubeConnection(userId)) {
      rows.push({
        provider: "youtube", action: YOUTUBE_VIDEO_ACTION,
        description: "Upload an approved verified MP4 video to an owned YouTube channel.", risk: "medium" as const,
        requiresApproval: true, deployed: true, inputSchema: YOUTUBE_VIDEO_INPUT_SCHEMA,
      });
      if (await hasDirectConnectedService(userId, "youtube")) {
        for (const action of directConnectedServiceActions("youtube")) {
          rows.push({
            provider: "youtube", action,
            description: `Read ${action.replace(/_/g, " ")} through YouTube's native OAuth API.`, risk: "low" as const,
            requiresApproval: false, deployed: true, inputSchema: DIRECT_INPUT_SCHEMA,
          });
        }
      }
    }
    return rows;
  },
  async isAvailable(userId, provider, action) {
    if (provider === "tiktok") {
      return (action === TIKTOK_SOCIAL_ACTION || action === TIKTOK_VIDEO_ACTION) && await hasNativeTikTokConnection(userId);
    }
    if (provider === "youtube") {
      if (action === YOUTUBE_VIDEO_ACTION) return hasNativeYouTubeConnection(userId);
      return directConnectedServiceActions("youtube").includes(action) && await hasDirectConnectedService(userId, "youtube");
    }
    return false;
  },
  async prepare(input) {
    if (input.provider === "tiktok" && input.action === TIKTOK_SOCIAL_ACTION) return prepareTikTokSocialAction(input);
    if (input.provider === "tiktok" && input.action === TIKTOK_VIDEO_ACTION) return prepareTikTokVideoAction(input);
    if (input.provider === "youtube" && input.action === YOUTUBE_VIDEO_ACTION) return prepareYouTubeVideoAction(input);
    if (input.provider === "youtube") {
      buildConnectedServiceRequest(asDirectInput(input.provider, input.action, input.actionInput));
      if (!(await hasDirectConnectedService(input.userId, "youtube"))) throw new Error("YouTube is not connected through its native OAuth integration.");
      return {
        provider: "youtube", action: input.action,
        description: `Read ${input.action.replace(/_/g, " ")} through YouTube's native OAuth API.`,
        risk: "low", requiresApproval: false, input: input.actionInput,
      };
    }
    throw new Error(`Trusted media video adapter does not expose ${input.provider}:${input.action}.`);
  },
  async execute(input) {
    try {
      if (input.provider === "tiktok" && input.action === TIKTOK_SOCIAL_ACTION) {
        const prepared = await prepareTikTokSocialAction(input);
        const data = await publishTikTokPhotoPost({
          userId: input.userId, imageUrl: prepared.input.image_url, privacyLevel: prepared.input.privacy_level,
          allowComment: prepared.input.allow_comment, autoAddMusic: prepared.input.auto_add_music,
          brandContent: prepared.input.brand_content, brandOrganic: prepared.input.brand_organic,
          ...(prepared.input.title ? { title: prepared.input.title } : {}),
          ...(prepared.input.description ? { description: prepared.input.description } : {}),
          ...(input.signal ? { signal: input.signal } : {}),
        });
        return { ok: true, result: { provider: "tiktok", action: TIKTOK_SOCIAL_ACTION, read_only: false, transport: "direct_oauth", data } };
      }
      if (input.provider === "tiktok" && input.action === TIKTOK_VIDEO_ACTION) {
        const prepared = await prepareTikTokVideoAction(input);
        const data = await publishTikTokVideoPost({
          userId: input.userId, trustedMediaAssetId: prepared.input.trusted_media_asset_id,
          privacyLevel: prepared.input.privacy_level, allowComment: prepared.input.allow_comment,
          allowDuet: prepared.input.allow_duet, allowStitch: prepared.input.allow_stitch,
          brandContent: prepared.input.brand_content, brandOrganic: prepared.input.brand_organic,
          ...(prepared.input.title ? { title: prepared.input.title } : {}), ...(input.signal ? { signal: input.signal } : {}),
        });
        return { ok: true, result: { provider: "tiktok", action: TIKTOK_VIDEO_ACTION, read_only: false, transport: "direct_oauth", data } };
      }
      if (input.provider === "youtube" && input.action === YOUTUBE_VIDEO_ACTION) {
        const prepared = await prepareYouTubeVideoAction(input);
        const data = await uploadYouTubeVideo({
          userId: input.userId, trustedMediaAssetId: prepared.input.trusted_media_asset_id,
          channelId: prepared.input.channel_id, title: prepared.input.title,
          privacyStatus: prepared.input.privacy_status, madeForKids: prepared.input.made_for_kids,
          notifySubscribers: prepared.input.notify_subscribers,
          ...(prepared.input.description ? { description: prepared.input.description } : {}), ...(input.signal ? { signal: input.signal } : {}),
        });
        return { ok: true, result: { provider: "youtube", action: YOUTUBE_VIDEO_ACTION, read_only: false, transport: "direct_oauth", data } };
      }
      const result = await executeDirectConnectedService(input.userId, asDirectInput(input.provider, input.action, input.actionInput), input.signal);
      return { ok: true, result };
    } catch (error) {
      const write = input.action === TIKTOK_SOCIAL_ACTION || input.action === TIKTOK_VIDEO_ACTION || input.action === YOUTUBE_VIDEO_ACTION;
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Trusted media provider execution failed.",
        failurePhase: write ? "ambiguous" : "post_dispatch",
        safeToFailover: !write,
      };
    }
  },
};
