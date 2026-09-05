import type { IntegrationAdapter } from "./integration-adapters.server";
import {
  THREADS_SOCIAL_ACTION,
  THREADS_SOCIAL_INPUT_SCHEMA,
  hasNativeThreadsConnection,
  prepareThreadsSocialAction,
} from "./threads-social-actions.server";
import { publishThreadsTextPost } from "./threads-social.server";

export const threadsIntegrationAdapter: IntegrationAdapter = {
  id: "direct_oauth",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "threads",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "threads") return [];
    if (!(await hasNativeThreadsConnection(userId))) return [];
    return [{
      provider: "threads",
      action: THREADS_SOCIAL_ACTION,
      description: "Publish an approved text post through Meta's native Threads API.",
      risk: "medium",
      requiresApproval: true,
      deployed: true,
      inputSchema: THREADS_SOCIAL_INPUT_SCHEMA,
    }];
  },
  async isAvailable(userId, provider, action) {
    return provider === "threads"
      && action === THREADS_SOCIAL_ACTION
      && await hasNativeThreadsConnection(userId);
  },
  async prepare(input) {
    return prepareThreadsSocialAction(input);
  },
  async execute(input) {
    let prepared;
    try {
      prepared = await prepareThreadsSocialAction(input);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native Threads action preparation failed.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      };
    }
    try {
      const data = await publishThreadsTextPost({
        userId: input.userId,
        text: prepared.input.text,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      return {
        ok: true,
        result: {
          provider: "threads",
          action: THREADS_SOCIAL_ACTION,
          read_only: false,
          transport: "direct_oauth",
          data,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native Threads publishing failed.",
        failurePhase: "ambiguous",
        safeToFailover: false,
      };
    }
  },
};
