import type { IntegrationAdapter } from "./integration-adapters.server";
import {
  LINKEDIN_SOCIAL_ACTION,
  LINKEDIN_SOCIAL_INPUT_SCHEMA,
  hasNativeLinkedInPostingCapability,
  prepareLinkedInSocialAction,
} from "./linkedin-social-actions.server";
import { publishLinkedInTextPost } from "./linkedin-social.server";

export const linkedinIntegrationAdapter: IntegrationAdapter = {
  id: "direct_oauth",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "linkedin",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "linkedin") return [];
    if (!(await hasNativeLinkedInPostingCapability(userId))) return [];
    return [{
      provider: "linkedin",
      action: LINKEDIN_SOCIAL_ACTION,
      description: "Publish an approved member text post through LinkedIn's native UGC API.",
      risk: "medium",
      requiresApproval: true,
      deployed: true,
      inputSchema: LINKEDIN_SOCIAL_INPUT_SCHEMA,
    }];
  },
  async isAvailable(userId, provider, action) {
    return provider === "linkedin"
      && action === LINKEDIN_SOCIAL_ACTION
      && await hasNativeLinkedInPostingCapability(userId);
  },
  async prepare(input) {
    return prepareLinkedInSocialAction(input);
  },
  async execute(input) {
    let prepared;
    try {
      prepared = await prepareLinkedInSocialAction(input);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native LinkedIn action preparation failed.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      };
    }
    try {
      const data = await publishLinkedInTextPost({
        userId: input.userId,
        text: prepared.input.text,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      return {
        ok: true,
        result: {
          provider: "linkedin",
          action: LINKEDIN_SOCIAL_ACTION,
          read_only: false,
          transport: "direct_oauth",
          data,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native LinkedIn publishing failed.",
        failurePhase: "ambiguous",
        safeToFailover: false,
      };
    }
  },
};
