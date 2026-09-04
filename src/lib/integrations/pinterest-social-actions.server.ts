import { getIntegrationAccessToken } from "./oauth.server";
import { publishPinterestImagePin } from "./pinterest-social.server";

export const PINTEREST_SOCIAL_ACTION = "pinterest_image_pin" as const;

export const PINTEREST_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["board_id", "image_url", "description"],
  properties: {
    board_id: { type: "string", minLength: 2, maxLength: 80 },
    image_url: { type: "string", format: "uri", maxLength: 2000 },
    title: { type: "string", maxLength: 100 },
    description: { type: "string", minLength: 1, maxLength: 500 },
    link: { type: "string", format: "uri", maxLength: 2000 },
  },
  additionalProperties: false,
};

export type PreparedPinterestSocialAction = {
  provider: "pinterest";
  action: typeof PINTEREST_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    board_id: string;
    image_url: string;
    description: string;
    title?: string;
    link?: string;
  };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function httpsUrl(value: unknown, label: string): string {
  const raw = clean(value, 2000);
  if (!raw) throw new Error(`${label} is required.`);
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url.toString();
}

export async function hasNativePinterestConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "pinterest"));
}

export async function preparePinterestSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedPinterestSocialAction> {
  if (input.provider !== "pinterest" || input.action !== PINTEREST_SOCIAL_ACTION) {
    throw new Error(`Native Pinterest does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativePinterestConnection(input.userId))) {
    throw new Error("Pinterest is not connected through its native OAuth integration.");
  }

  const boardId = clean(input.actionInput["board_id"], 80);
  if (!/^\d{2,80}$/.test(boardId)) throw new Error("A valid Pinterest board ID is required.");
  const imageUrl = httpsUrl(input.actionInput["image_url"], "Pinterest image URL");
  const description = clean(input.actionInput["description"], 500);
  if (!description) throw new Error("Pinterest Pin description is required.");

  const prepared: PreparedPinterestSocialAction["input"] = {
    board_id: boardId,
    image_url: imageUrl,
    description,
  };
  const title = clean(input.actionInput["title"], 100);
  if (title) prepared.title = title;
  const rawLink = clean(input.actionInput["link"], 2000);
  if (rawLink) prepared.link = httpsUrl(rawLink, "Pinterest destination link");

  return {
    provider: "pinterest",
    action: PINTEREST_SOCIAL_ACTION,
    description: "Create an approved image Pin on an owned Pinterest board through the native Pinterest API.",
    risk: "medium",
    requiresApproval: true,
    input: prepared,
  };
}

export async function executePinterestSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const prepared = await preparePinterestSocialAction(input);
  const result = await publishPinterestImagePin({
    userId: input.userId,
    boardId: prepared.input.board_id,
    imageUrl: prepared.input.image_url,
    description: prepared.input.description,
    ...(prepared.input.title ? { title: prepared.input.title } : {}),
    ...(prepared.input.link ? { link: prepared.input.link } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
  });
  return {
    provider: "pinterest",
    action: PINTEREST_SOCIAL_ACTION,
    read_only: false,
    transport: "direct_oauth",
    data: result,
  };
}
