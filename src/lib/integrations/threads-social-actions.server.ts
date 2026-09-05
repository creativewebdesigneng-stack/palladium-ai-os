import { getIntegrationAccessToken } from "./oauth.server";

export const THREADS_SOCIAL_ACTION = "threads_text_post" as const;

export const THREADS_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["text"],
  properties: {
    text: { type: "string", minLength: 1, maxLength: 500 },
  },
  additionalProperties: false,
};

export type PreparedThreadsSocialAction = {
  provider: "threads";
  action: typeof THREADS_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: { text: string };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

export async function hasNativeThreadsConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "threads"));
}

export async function prepareThreadsSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedThreadsSocialAction> {
  if (input.provider !== "threads" || input.action !== THREADS_SOCIAL_ACTION) {
    throw new Error(`Native Threads does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeThreadsConnection(input.userId))) {
    throw new Error("Threads is not connected through its native OAuth integration.");
  }
  const postText = clean(input.actionInput["text"], 500);
  if (!postText) throw new Error("Threads post text is required.");
  return {
    provider: "threads",
    action: THREADS_SOCIAL_ACTION,
    description: "Publish an approved text post through Meta's native Threads API.",
    risk: "medium",
    requiresApproval: true,
    input: { text: postText },
  };
}
