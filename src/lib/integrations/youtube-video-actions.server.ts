import { getVerifiedTrustedMediaAssetForUser } from "@/lib/media/trusted-media.server";
import { getIntegrationAccessToken } from "./oauth.server";
import { discoverYouTubeChannels } from "./youtube-social.server";

export const YOUTUBE_VIDEO_ACTION = "youtube_video_upload" as const;
export const YOUTUBE_VIDEO_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["trusted_media_asset_id", "channel_id", "title", "privacy_status"],
  properties: {
    trusted_media_asset_id: { type: "string", format: "uuid" },
    channel_id: { type: "string", maxLength: 160 },
    title: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", maxLength: 5000 },
    privacy_status: { type: "string", enum: ["private", "unlisted", "public"] },
    made_for_kids: { type: "boolean" },
    notify_subscribers: { type: "boolean" },
  },
  additionalProperties: false,
};

export type PreparedYouTubeVideoAction = {
  provider: "youtube";
  action: typeof YOUTUBE_VIDEO_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    trusted_media_asset_id: string;
    channel_id: string;
    title: string;
    privacy_status: "private" | "unlisted" | "public";
    description?: string;
    made_for_kids: boolean;
    notify_subscribers: boolean;
  };
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function hasNativeYouTubeConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "youtube"));
}

export async function prepareYouTubeVideoAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedYouTubeVideoAction> {
  if (input.provider !== "youtube" || input.action !== YOUTUBE_VIDEO_ACTION) {
    throw new Error(`Native YouTube video does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeYouTubeConnection(input.userId))) throw new Error("YouTube is not connected through its native OAuth integration.");
  const asset = await getVerifiedTrustedMediaAssetForUser(input.userId, text(input.actionInput["trusted_media_asset_id"], 60));
  const channelId = text(input.actionInput["channel_id"], 160);
  const channels = await discoverYouTubeChannels(input.userId);
  if (!channels.some((channel) => channel.id === channelId)) throw new Error("The selected YouTube channel is not owned by the connected account.");
  const title = text(input.actionInput["title"], 100);
  if (!title) throw new Error("A YouTube video title is required.");
  const privacy = text(input.actionInput["privacy_status"], 20);
  if (!new Set(["private", "unlisted", "public"]).has(privacy)) throw new Error("A valid YouTube privacy status is required.");
  const prepared: PreparedYouTubeVideoAction["input"] = {
    trusted_media_asset_id: asset.id,
    channel_id: channelId,
    title,
    privacy_status: privacy as "private" | "unlisted" | "public",
    made_for_kids: input.actionInput["made_for_kids"] === true,
    notify_subscribers: input.actionInput["notify_subscribers"] !== false,
  };
  const description = text(input.actionInput["description"], 5000);
  if (description) prepared.description = description;
  return {
    provider: "youtube", action: YOUTUBE_VIDEO_ACTION,
    description: "Upload an approved verified MP4 video to an owned YouTube channel using the resumable upload protocol.",
    risk: "medium", requiresApproval: true, input: prepared,
  };
}
