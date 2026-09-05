import type { IntegrationAdapter } from "./integration-adapters.server";
import {
  INSTAGRAM_SOCIAL_ACTION,
  INSTAGRAM_SOCIAL_INPUT_SCHEMA,
  hasNativeInstagramConnection,
  prepareInstagramSocialAction,
} from "./instagram-social-actions.server";
import { publishInstagramImagePost } from "./instagram-social.server";

/**
 * Native Instagram extension for the shared direct_oauth lane.
 * Kept separate from the core adapter so Meta/Facebook's already-green runtime
 * does not need a broad rewrite while Instagram publishing is introduced.
 */
export const instagramIntegrationAdapter: IntegrationAdapter = {
  id: "direct_oauth",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "instagram",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "instagram") return [];
    if (!(await hasNativeInstagramConnection(userId))) return [];
    return [{
      provider: "instagram",
      action: INSTAGRAM_SOCIAL_ACTION,
      description: "Publish an approved single-image post to a linked Instagram professional account through Meta's native publishing API.",
      risk: "medium",
      requiresApproval: true,
      deployed: true,
      inputSchema: INSTAGRAM_SOCIAL_INPUT_SCHEMA,
    }];
  },
  async isAvailable(userId, provider, action) {
    return provider === "instagram"
      && action === INSTAGRAM_SOCIAL_ACTION
      && await hasNativeInstagramConnection(userId);
  },
  async prepare(input) {
    return prepareInstagramSocialAction(input);
  },
  async execute(input) {
    let prepared;
    try {
      prepared = await prepareInstagramSocialAction(input);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native Instagram action preparation failed.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      };
    }

    try {
      const data = await publishInstagramImagePost({
        userId: input.userId,
        instagramId: prepared.input.instagram_id,
        imageUrl: prepared.input.image_url,
        caption: prepared.input.caption,
        ...(prepared.input.alt_text ? { altText: prepared.input.alt_text } : {}),
        ...(input.signal ? { signal: input.signal } : {}),
      });
      return {
        ok: true,
        result: {
          provider: "instagram",
          action: INSTAGRAM_SOCIAL_ACTION,
          read_only: false,
          transport: "direct_oauth",
          data,
        },
      };
    } catch (error) {
      // Once the media container request begins, dispatch outcome can be
      // ambiguous. Never replay a native Instagram mutation through Nango.
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native Instagram publishing failed.",
        failurePhase: "ambiguous",
        safeToFailover: false,
      };
    }
  },
};
