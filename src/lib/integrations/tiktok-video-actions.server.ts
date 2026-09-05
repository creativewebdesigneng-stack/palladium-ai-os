import { getVerifiedTrustedMediaAssetForUser } from "@/lib/media/trusted-media.server";
import { getIntegrationAccessToken } from "./oauth.server";
import { queryTikTokCreatorInfo } from "./tiktok-social.server";

export const TIKTOK_VIDEO_ACTION = "tiktok_video_post" as const;

export const TIKTOK_VIDEO_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["trusted_media_asset_id", "privacy_level", "allow_comment", "allow_duet", "allow_stitch", "brand_content", "brand_organic", "music_usage_confirmed"],
  properties: {
    trusted_media_asset_id: { type: "string", format: "uuid" },
    privacy_level: { type: "string", enum: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"] },
    allow_comment: { type: "boolean" },
    allow_duet: { type: "boolean" },
    allow_stitch: { type: "boolean" },
    brand_content: { type: "boolean" },
    brand_organic: { type: "boolean" },
    music_usage_confirmed: { type: "boolean", const: true },
    title: { type: "string", maxLength: 150 },
  },
  additionalProperties: false,
};

export type PreparedTikTokVideoAction = {
  provider: "tiktok";
  action: typeof TIKTOK_VIDEO_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    trusted_media_asset_id: string;
    privacy_level: string;
    allow_comment: boolean;
    allow_duet: boolean;
    allow_stitch: boolean;
    brand_content: boolean;
    brand_organic: boolean;
    music_usage_confirmed: true;
    title?: string;
  };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be explicitly selected.`);
  return value;
}

export async function prepareTikTokVideoAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedTikTokVideoAction> {
  if (input.provider !== "tiktok" || input.action !== TIKTOK_VIDEO_ACTION) {
    throw new Error(`Native TikTok video does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await getIntegrationAccessToken(input.userId, "tiktok"))) {
    throw new Error("TikTok is not connected through its native OAuth integration.");
  }
  const assetId = clean(input.actionInput["trusted_media_asset_id"], 60);
  const asset = await getVerifiedTrustedMediaAssetForUser(input.userId, assetId);
  const creator = await queryTikTokCreatorInfo(input.userId);
  if (creator.maxVideoPostDurationSec && asset.durationSeconds > creator.maxVideoPostDurationSec) {
    throw new Error(`Video exceeds this TikTok creator's ${creator.maxVideoPostDurationSec}s posting limit.`);
  }
  const privacyLevel = clean(input.actionInput["privacy_level"], 80);
  if (!creator.privacyLevelOptions.includes(privacyLevel)) {
    throw new Error("The selected TikTok privacy level is not currently available for this creator.");
  }
  const allowComment = requiredBoolean(input.actionInput["allow_comment"], "TikTok comment preference");
  const allowDuet = requiredBoolean(input.actionInput["allow_duet"], "TikTok duet preference");
  const allowStitch = requiredBoolean(input.actionInput["allow_stitch"], "TikTok stitch preference");
  const brandContent = requiredBoolean(input.actionInput["brand_content"], "TikTok branded-content disclosure");
  const brandOrganic = requiredBoolean(input.actionInput["brand_organic"], "TikTok own-brand disclosure");
  if (allowComment && creator.commentDisabled) throw new Error("TikTok comments are disabled for this creator.");
  if (allowDuet && creator.duetDisabled) throw new Error("TikTok duets are disabled for this creator.");
  if (allowStitch && creator.stitchDisabled) throw new Error("TikTok stitches are disabled for this creator.");
  if (brandContent && privacyLevel === "SELF_ONLY") throw new Error("TikTok branded content cannot use private visibility.");
  if (input.actionInput["music_usage_confirmed"] !== true) throw new Error("TikTok Music Usage Confirmation must be accepted before publishing.");

  const prepared: PreparedTikTokVideoAction["input"] = {
    trusted_media_asset_id: asset.id,
    privacy_level: privacyLevel,
    allow_comment: allowComment,
    allow_duet: allowDuet,
    allow_stitch: allowStitch,
    brand_content: brandContent,
    brand_organic: brandOrganic,
    music_usage_confirmed: true,
  };
  const title = clean(input.actionInput["title"], 150);
  if (title) prepared.title = title;
  return {
    provider: "tiktok", action: TIKTOK_VIDEO_ACTION,
    description: "Publish an approved verified MP4 video to TikTok using Direct Post FILE_UPLOAD.",
    risk: "medium", requiresApproval: true, input: prepared,
  };
}
