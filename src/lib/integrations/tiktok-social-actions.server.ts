import { getIntegrationAccessToken } from "./oauth.server";
import { queryTikTokCreatorInfo, verifiedTikTokMediaUrl } from "./tiktok-social.server";

export const TIKTOK_SOCIAL_ACTION = "tiktok_photo_post" as const;

export const TIKTOK_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: [
    "image_url",
    "privacy_level",
    "allow_comment",
    "auto_add_music",
    "brand_content",
    "brand_organic",
    "music_usage_confirmed",
  ],
  properties: {
    image_url: { type: "string", format: "uri", maxLength: 2000 },
    privacy_level: {
      type: "string",
      enum: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"],
    },
    allow_comment: { type: "boolean" },
    auto_add_music: { type: "boolean" },
    brand_content: { type: "boolean" },
    brand_organic: { type: "boolean" },
    music_usage_confirmed: { type: "boolean", const: true },
    title: { type: "string", maxLength: 90 },
    description: { type: "string", maxLength: 4000 },
  },
  additionalProperties: false,
};

export type PreparedTikTokSocialAction = {
  provider: "tiktok";
  action: typeof TIKTOK_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    image_url: string;
    privacy_level: string;
    allow_comment: boolean;
    auto_add_music: boolean;
    brand_content: boolean;
    brand_organic: boolean;
    music_usage_confirmed: true;
    title?: string;
    description?: string;
  };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be explicitly selected.`);
  return value;
}

export async function hasNativeTikTokConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "tiktok"));
}

export async function prepareTikTokSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedTikTokSocialAction> {
  if (input.provider !== "tiktok" || input.action !== TIKTOK_SOCIAL_ACTION) {
    throw new Error(`Native TikTok does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeTikTokConnection(input.userId))) {
    throw new Error("TikTok is not connected through its native OAuth integration.");
  }

  const imageUrl = verifiedTikTokMediaUrl(input.actionInput["image_url"]);
  const privacyLevel = clean(input.actionInput["privacy_level"], 80);
  if (!privacyLevel) throw new Error("Choose a TikTok privacy level before publishing.");
  const allowComment = requiredBoolean(input.actionInput["allow_comment"], "TikTok comment preference");
  const autoAddMusic = requiredBoolean(input.actionInput["auto_add_music"], "TikTok music preference");
  const brandContent = requiredBoolean(input.actionInput["brand_content"], "TikTok branded-content disclosure");
  const brandOrganic = requiredBoolean(input.actionInput["brand_organic"], "TikTok own-brand disclosure");
  if (input.actionInput["music_usage_confirmed"] !== true) {
    throw new Error("TikTok Music Usage Confirmation must be accepted before publishing.");
  }

  const creator = await queryTikTokCreatorInfo(input.userId);
  if (!creator.privacyLevelOptions.includes(privacyLevel)) {
    throw new Error("The selected TikTok privacy level is not currently available for this creator.");
  }
  if (allowComment && creator.commentDisabled) {
    throw new Error("TikTok comments are disabled for this creator.");
  }
  if (brandContent && privacyLevel === "SELF_ONLY") {
    throw new Error("TikTok branded content cannot use private (Only me) visibility.");
  }

  const prepared: PreparedTikTokSocialAction["input"] = {
    image_url: imageUrl,
    privacy_level: privacyLevel,
    allow_comment: allowComment,
    auto_add_music: autoAddMusic,
    brand_content: brandContent,
    brand_organic: brandOrganic,
    music_usage_confirmed: true,
  };
  const title = clean(input.actionInput["title"], 90);
  if (title) prepared.title = title;
  const description = clean(input.actionInput["description"], 4000);
  if (description) prepared.description = description;

  return {
    provider: "tiktok",
    action: TIKTOK_SOCIAL_ACTION,
    description: "Publish an approved photo to TikTok through Direct Post using creator-selected privacy and disclosure settings.",
    risk: "medium",
    requiresApproval: true,
    input: prepared,
  };
}
