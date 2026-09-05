import { getIntegrationAccessToken } from "./oauth.server";
import { discoverNativeInstagramAccounts } from "./instagram-social.server";

export const INSTAGRAM_SOCIAL_ACTION = "instagram_image_post" as const;

export const INSTAGRAM_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["instagram_id", "image_url", "caption"],
  properties: {
    instagram_id: { type: "string", minLength: 2, maxLength: 160 },
    image_url: { type: "string", format: "uri", maxLength: 2000 },
    caption: { type: "string", minLength: 1, maxLength: 2200 },
    alt_text: { type: "string", maxLength: 1000 },
  },
  additionalProperties: false,
};

export type PreparedInstagramSocialAction = {
  provider: "instagram";
  action: typeof INSTAGRAM_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    instagram_id: string;
    image_url: string;
    caption: string;
    alt_text?: string;
  };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanHttpsUrl(value: unknown): string {
  const raw = clean(value, 2000);
  if (!raw) throw new Error("Instagram image URL is required.");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("Instagram image URL must be a clean HTTPS URL.");
  }
  return url.toString();
}

export async function hasNativeInstagramConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "meta"));
}

export async function prepareInstagramSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedInstagramSocialAction> {
  if (input.provider !== "instagram" || input.action !== INSTAGRAM_SOCIAL_ACTION) {
    throw new Error(`Native Instagram does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeInstagramConnection(input.userId))) {
    throw new Error("Instagram is not connected through the native Meta OAuth integration.");
  }

  const instagramId = clean(input.actionInput["instagram_id"], 160);
  if (!instagramId) throw new Error("Choose an Instagram professional account before publishing.");
  const accounts = await discoverNativeInstagramAccounts(input.userId);
  if (!accounts.some((account) => account.instagramId === instagramId)) {
    throw new Error("The selected Instagram professional account is not available to this Meta connection.");
  }

  const imageUrl = cleanHttpsUrl(input.actionInput["image_url"]);
  const caption = clean(input.actionInput["caption"], 2200);
  if (!caption) throw new Error("Instagram caption is required.");
  const altText = clean(input.actionInput["alt_text"], 1000);

  return {
    provider: "instagram",
    action: INSTAGRAM_SOCIAL_ACTION,
    description: "Publish an approved single-image post to a linked Instagram professional account through Meta's native publishing API.",
    risk: "medium",
    requiresApproval: true,
    input: {
      instagram_id: instagramId,
      image_url: imageUrl,
      caption,
      ...(altText ? { alt_text: altText } : {}),
    },
  };
}
