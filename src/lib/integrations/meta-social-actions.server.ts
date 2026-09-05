import { getIntegrationAccessToken } from "./oauth.server";
import { publishFacebookPagePost } from "./meta-social.server";

export const META_SOCIAL_ACTION = "facebook_page_post" as const;

export const META_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["page_id", "message"],
  properties: {
    page_id: { type: "string", minLength: 2, maxLength: 160 },
    message: { type: "string", minLength: 1, maxLength: 63000 },
    link: { type: "string", format: "uri", maxLength: 2000 },
  },
  additionalProperties: false,
};

export type PreparedMetaSocialAction = {
  provider: "facebook";
  action: typeof META_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: { page_id: string; message: string; link?: string };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function hasNativeMetaConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "meta"));
}

export async function prepareMetaSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedMetaSocialAction> {
  if (input.provider !== "facebook" || input.action !== META_SOCIAL_ACTION) {
    throw new Error(`Native Meta does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeMetaConnection(input.userId))) {
    throw new Error("Meta is not connected through its native OAuth integration.");
  }

  const pageId = clean(input.actionInput["page_id"], 160);
  const message = clean(input.actionInput["message"], 63_000);
  if (!/^[A-Za-z0-9_-]{2,160}$/.test(pageId)) {
    throw new Error("A valid Facebook Page ID is required.");
  }
  if (!message) throw new Error("Facebook post content is required.");

  const prepared: PreparedMetaSocialAction["input"] = { page_id: pageId, message };
  const rawLink = clean(input.actionInput["link"], 2_000);
  if (rawLink) {
    const link = new URL(rawLink);
    if (link.protocol !== "https:") throw new Error("Facebook post links must use HTTPS.");
    prepared.link = link.toString();
  }

  return {
    provider: "facebook",
    action: META_SOCIAL_ACTION,
    description: "Publish an approved post to a Facebook Page through Meta's native Graph API.",
    risk: "medium",
    requiresApproval: true,
    input: prepared,
  };
}

export async function executeMetaSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const prepared = await prepareMetaSocialAction(input);
  const result = await publishFacebookPagePost({
    userId: input.userId,
    pageId: prepared.input.page_id,
    message: prepared.input.message,
    ...(prepared.input.link ? { link: prepared.input.link } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
  });
  return {
    provider: "facebook",
    action: META_SOCIAL_ACTION,
    read_only: false,
    transport: "direct_oauth",
    data: result,
  };
}
