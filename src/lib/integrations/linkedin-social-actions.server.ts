import { getIntegrationAccessToken } from "./oauth.server";
import { resolveLinkedInMemberAuthor } from "./linkedin-social.server";

export const LINKEDIN_SOCIAL_ACTION = "linkedin_text_post" as const;
export const LINKEDIN_SOCIAL_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["text"],
  properties: { text: { type: "string", minLength: 1, maxLength: 3000 } },
  additionalProperties: false,
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 3000) : "";
}

export async function hasNativeLinkedInPostingCapability(userId: string): Promise<boolean> {
  if (!(await getIntegrationAccessToken(userId, "linkedin"))) return false;
  try { return Boolean(await resolveLinkedInMemberAuthor(userId)); }
  catch { return false; }
}

export async function prepareLinkedInSocialAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  if (input.provider !== "linkedin" || input.action !== LINKEDIN_SOCIAL_ACTION) {
    throw new Error(`Native LinkedIn does not expose ${input.provider}:${input.action}.`);
  }
  const author = await resolveLinkedInMemberAuthor(input.userId);
  if (!author) throw new Error("LinkedIn posting is unavailable because this app connection does not expose a legitimate member author ID.");
  const body = clean(input.actionInput["text"]);
  if (!body) throw new Error("LinkedIn post text is required.");
  return {
    provider: "linkedin",
    action: LINKEDIN_SOCIAL_ACTION,
    description: "Publish an approved text post through LinkedIn's native UGC API using the app-scoped current-member identity.",
    risk: "medium" as const,
    requiresApproval: true,
    input: { text: body },
  };
}
