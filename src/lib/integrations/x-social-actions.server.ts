import { getIntegrationAccessToken } from "./oauth.server";

export const X_SOCIAL_ACTION = "x_text_post" as const;

export const X_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["text"],
  properties: {
    text: { type: "string", minLength: 1, maxLength: 10_000 },
    made_with_ai: { type: "boolean" },
    paid_partnership: { type: "boolean" },
  },
  additionalProperties: false,
};

export type PreparedXSocialAction = {
  provider: "x";
  action: typeof X_SOCIAL_ACTION;
  description: string;
  risk: "medium";
  requiresApproval: true;
  input: {
    text: string;
    made_with_ai: boolean;
    paid_partnership: boolean;
  };
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function hasNativeXConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "x"));
}

export async function prepareXSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedXSocialAction> {
  if (input.provider !== "x" || input.action !== X_SOCIAL_ACTION) {
    throw new Error(`Native X does not expose ${input.provider}:${input.action}.`);
  }
  if (!(await hasNativeXConnection(input.userId))) {
    throw new Error("X is not connected through its native OAuth integration.");
  }
  const text = clean(input.actionInput["text"], 10_000);
  if (!text) throw new Error("X post text is required.");
  return {
    provider: "x",
    action: X_SOCIAL_ACTION,
    description: "Publish an approved text post through the native X API v2.",
    risk: "medium",
    requiresApproval: true,
    input: {
      text,
      made_with_ai: input.actionInput["made_with_ai"] === true,
      paid_partnership: input.actionInput["paid_partnership"] === true,
    },
  };
}
