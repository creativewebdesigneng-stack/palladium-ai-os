import type { ExecutionLane } from "./capability-catalog";
import {
  directConnectedServiceActions,
  executeDirectConnectedService,
  hasDirectConnectedService,
  isDirectConnectedServiceProvider,
} from "./direct-connected-service.server";
import {
  buildConnectedServiceRequest,
  type ConnectedServiceInput,
} from "./connected-service.server";
import {
  executeGitHubConnectedService,
  getUserGitHubInstallationId,
  GITHUB_CONNECTED_SERVICE_ACTIONS,
  type GitHubConnectedServiceInput,
} from "./github-connected-service.server";
import {
  META_SOCIAL_ACTION,
  META_SOCIAL_INPUT_SCHEMA,
  hasNativeMetaConnection,
  prepareMetaSocialAction,
} from "./meta-social-actions.server";
import { publishFacebookPagePost } from "./meta-social.server";
import {
  PINTEREST_SOCIAL_ACTION,
  PINTEREST_SOCIAL_INPUT_SCHEMA,
  hasNativePinterestConnection,
  preparePinterestSocialAction,
} from "./pinterest-social-actions.server";
import { publishPinterestImagePin } from "./pinterest-social.server";
import {
  TIKTOK_SOCIAL_ACTION,
  TIKTOK_SOCIAL_INPUT_SCHEMA,
  hasNativeTikTokConnection,
  prepareTikTokSocialAction,
} from "./tiktok-social-actions.server";
import { publishTikTokPhotoPost } from "./tiktok-social.server";
import {
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";
import { isSafeNangoProviderId } from "./nango-providers";
import {
  executeNativeShopifyAction,
  hasNativeShopifyConnection,
  listNativeShopifyCapabilities,
  prepareNativeShopifyAction,
} from "./shopify.server";
import {
  getIntegrationAccessToken,
  getIntegrationProviderConfig,
  normaliseSalesforceInstanceUrl,
} from "./oauth.server";
import {
  searchSalesforceAccounts,
  searchSalesforceOpportunities,
} from "./salesforce.server";

export type IntegrationActionRisk = NangoActionRisk;
export type IntegrationAdapterId = "direct_oauth" | "github_app" | "salesforce_oauth" | "native_shopify" | "nango";

export type AdapterCapability = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  deployed: boolean;
  inputSchema: Record<string, unknown>;
};

export type AdapterPreparedAction = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  input: Record<string, unknown>;
};

export type AdapterExecutionOutcome =
  | { ok: true; result: unknown }
  | {
      ok: false;
      error: string;
      failurePhase: "pre_dispatch" | "post_dispatch" | "ambiguous";
      safeToFailover: boolean;
    };

export type IntegrationAdapter = {
  id: IntegrationAdapterId;
  lane: ExecutionLane;
  supportsProvider(provider: string): boolean;
  listCapabilities(userId: string, provider?: string): Promise<AdapterCapability[]>;
  isAvailable(userId: string, provider: string, action: string): Promise<boolean>;
  prepare(input: {
    userId: string;
    provider: string;
    action: string;
    actionInput: Record<string, unknown>;
  }): Promise<AdapterPreparedAction>;
  execute(input: {
    userId: string;
    provider: string;
    action: string;
    actionInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<AdapterExecutionOutcome>;
};

const DIRECT_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    query: { type: "string", maxLength: 200 },
    resource_id: { type: "string", maxLength: 160 },
    repository: { type: "string", maxLength: 200 },
    path: { type: "string", maxLength: 500 },
    ref: { type: "string", maxLength: 160 },
    limit: { type: "integer", minimum: 1, maximum: 25 },
  },
  additionalProperties: false,
};

const GITHUB_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    repository: { type: "string", maxLength: 220 },
    path: { type: "string", maxLength: 1000 },
    ref: { type: "string", maxLength: 160 },
    limit: { type: "integer", minimum: 1, maximum: 25 },
  },
  additionalProperties: false,
};

const SALESFORCE_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["query"],
  properties: {
    query: { type: "string", minLength: 1, maxLength: 200 },
    limit: { type: "integer", minimum: 1, maximum: 50 },
  },
  additionalProperties: false,
};

function asDirectInput(
  provider: string,
  action: string,
  actionInput: Record<string, unknown>,
): ConnectedServiceInput {
  const value = actionInput as Partial<ConnectedServiceInput>;
  return {
    provider,
    action,
    ...(typeof value.query === "string" ? { query: value.query } : {}),
    ...(typeof value.resource_id === "string" ? { resource_id: value.resource_id } : {}),
    ...(typeof value.repository === "string" ? { repository: value.repository } : {}),
    ...(typeof value.path === "string" ? { path: value.path } : {}),
    ...(typeof value.ref === "string" ? { ref: value.ref } : {}),
    ...(typeof value.limit === "number" ? { limit: value.limit } : {}),
  };
}

function asGitHubInput(action: string, actionInput: Record<string, unknown>): GitHubConnectedServiceInput {
  return {
    action,
    ...(typeof actionInput["repository"] === "string"
      ? { repository: actionInput["repository"] as string }
      : {}),
    ...(typeof actionInput["path"] === "string" ? { path: actionInput["path"] as string } : {}),
    ...(typeof actionInput["ref"] === "string" ? { ref: actionInput["ref"] as string } : {}),
    ...(typeof actionInput["limit"] === "number" ? { limit: actionInput["limit"] as number } : {}),
  };
}

async function hasSalesforceDirectConnection(userId: string): Promise<boolean> {
  const [token, config] = await Promise.all([
    getIntegrationAccessToken(userId, "salesforce"),
    getIntegrationProviderConfig(userId, "salesforce"),
  ]);
  return Boolean(token && normaliseSalesforceInstanceUrl(config["instance_url"]));
}

const directOAuthAdapter: IntegrationAdapter = {
  id: "direct_oauth",
  lane: "direct_api",
  supportsProvider(provider) {
    return isDirectConnectedServiceProvider(provider) || provider === "facebook" || provider === "pinterest" || provider === "tiktok";
  },
  async listCapabilities(userId, provider) {
    const rows: AdapterCapability[] = [];

    if ((!provider || provider === "facebook") && await hasNativeMetaConnection(userId)) {
      rows.push({
        provider: "facebook",
        action: META_SOCIAL_ACTION,
        description: "Publish an approved post to a Facebook Page through Meta's native Graph API.",
        risk: "medium",
        requiresApproval: true,
        deployed: true,
        inputSchema: META_SOCIAL_INPUT_SCHEMA,
      });
    }

    if ((!provider || provider === "pinterest") && await hasNativePinterestConnection(userId)) {
      rows.push({
        provider: "pinterest",
        action: PINTEREST_SOCIAL_ACTION,
        description: "Create an approved image Pin on an owned Pinterest board through the native Pinterest API.",
        risk: "medium",
        requiresApproval: true,
        deployed: true,
        inputSchema: PINTEREST_SOCIAL_INPUT_SCHEMA,
      });
    }

    if ((!provider || provider === "tiktok") && await hasNativeTikTokConnection(userId)) {
      rows.push({
        provider: "tiktok",
        action: TIKTOK_SOCIAL_ACTION,
        description: "Publish an approved photo to TikTok through Direct Post using creator-selected privacy and disclosure settings.",
        risk: "medium",
        requiresApproval: true,
        deployed: true,
        inputSchema: TIKTOK_SOCIAL_INPUT_SCHEMA,
      });
    }

    const providers = provider
      ? [provider]
      : ["google", "youtube", "microsoft", "slack", "hubspot", "notion", "asana", "linear"];
    for (const providerId of providers) {
      if (!isDirectConnectedServiceProvider(providerId)) continue;
      if (!(await hasDirectConnectedService(userId, providerId))) continue;
      for (const action of directConnectedServiceActions(providerId)) {
        rows.push({
          provider: providerId,
          action,
          description: `Read ${action.replace(/_/g, " ")} through the provider's native OAuth API.`,
          risk: "low",
          requiresApproval: false,
          deployed: true,
          inputSchema: DIRECT_INPUT_SCHEMA,
        });
      }
    }
    return rows;
  },
  async isAvailable(userId, provider, action) {
    if (provider === "facebook") {
      return action === META_SOCIAL_ACTION && await hasNativeMetaConnection(userId);
    }
    if (provider === "pinterest") {
      return action === PINTEREST_SOCIAL_ACTION && await hasNativePinterestConnection(userId);
    }
    if (provider === "tiktok") {
      return action === TIKTOK_SOCIAL_ACTION && await hasNativeTikTokConnection(userId);
    }
    return (
      isDirectConnectedServiceProvider(provider) &&
      directConnectedServiceActions(provider).includes(action) &&
      (await hasDirectConnectedService(userId, provider))
    );
  },
  async prepare(input) {
    if (input.provider === "facebook") return prepareMetaSocialAction(input);
    if (input.provider === "pinterest") return preparePinterestSocialAction(input);
    if (input.provider === "tiktok") return prepareTikTokSocialAction(input);
    if (!isDirectConnectedServiceProvider(input.provider)) {
      throw new Error(`No direct OAuth adapter is registered for ${input.provider}.`);
    }
    buildConnectedServiceRequest(asDirectInput(input.provider, input.action, input.actionInput));
    if (!(await hasDirectConnectedService(input.userId, input.provider))) {
      throw new Error(`${input.provider} is not connected through its native OAuth integration.`);
    }
    return {
      provider: input.provider,
      action: input.action,
      description: `Read ${input.action.replace(/_/g, " ")} through the provider's native OAuth API.`,
      risk: "low",
      requiresApproval: false,
      input: input.actionInput,
    };
  },
  async execute(input) {
    if (input.provider === "facebook") {
      let prepared;
      try {
        prepared = await prepareMetaSocialAction(input);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native Meta action preparation failed.",
          failurePhase: "pre_dispatch",
          safeToFailover: true,
        };
      }
      try {
        const data = await publishFacebookPagePost({
          userId: input.userId,
          pageId: prepared.input.page_id,
          message: prepared.input.message,
          ...(prepared.input.link ? { link: prepared.input.link } : {}),
          ...(input.signal ? { signal: input.signal } : {}),
        });
        return {
          ok: true,
          result: { provider: "facebook", action: META_SOCIAL_ACTION, read_only: false, transport: "direct_oauth", data },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native Meta publishing failed.",
          failurePhase: "ambiguous",
          safeToFailover: false,
        };
      }
    }

    if (input.provider === "pinterest") {
      let prepared;
      try {
        prepared = await preparePinterestSocialAction(input);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native Pinterest action preparation failed.",
          failurePhase: "pre_dispatch",
          safeToFailover: true,
        };
      }
      try {
        const data = await publishPinterestImagePin({
          userId: input.userId,
          boardId: prepared.input.board_id,
          imageUrl: prepared.input.image_url,
          description: prepared.input.description,
          ...(prepared.input.title ? { title: prepared.input.title } : {}),
          ...(prepared.input.link ? { link: prepared.input.link } : {}),
          ...(input.signal ? { signal: input.signal } : {}),
        });
        return {
          ok: true,
          result: { provider: "pinterest", action: PINTEREST_SOCIAL_ACTION, read_only: false, transport: "direct_oauth", data },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native Pinterest publishing failed.",
          failurePhase: "ambiguous",
          safeToFailover: false,
        };
      }
    }

    if (input.provider === "tiktok") {
      let prepared;
      try {
        prepared = await prepareTikTokSocialAction(input);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native TikTok action preparation failed.",
          failurePhase: "pre_dispatch",
          safeToFailover: true,
        };
      }
      try {
        const data = await publishTikTokPhotoPost({
          userId: input.userId,
          imageUrl: prepared.input.image_url,
          privacyLevel: prepared.input.privacy_level,
          allowComment: prepared.input.allow_comment,
          autoAddMusic: prepared.input.auto_add_music,
          brandContent: prepared.input.brand_content,
          brandOrganic: prepared.input.brand_organic,
          ...(prepared.input.title ? { title: prepared.input.title } : {}),
          ...(prepared.input.description ? { description: prepared.input.description } : {}),
          ...(input.signal ? { signal: input.signal } : {}),
        });
        return {
          ok: true,
          result: { provider: "tiktok", action: TIKTOK_SOCIAL_ACTION, read_only: false, transport: "direct_oauth", data },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Native TikTok publishing failed.",
          failurePhase: "ambiguous",
          safeToFailover: false,
        };
      }
    }

    try {
      const result = await executeDirectConnectedService(
        input.userId,
        asDirectInput(input.provider, input.action, input.actionInput),
        input.signal,
      );
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Direct API execution failed.",
        failurePhase: "post_dispatch",
        safeToFailover: true,
      };
    }
  },
};

const githubAppAdapter: IntegrationAdapter = {
  id: "github_app",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "github",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "github") return [];
    if (!(await getUserGitHubInstallationId(userId))) return [];
    return GITHUB_CONNECTED_SERVICE_ACTIONS.map((action) => ({
      provider: "github",
      action,
      description: `Read ${action.replace(/_/g, " ")} through the user's GitHub App installation.`,
      risk: "low" as const,
      requiresApproval: false,
      deployed: true,
      inputSchema: GITHUB_INPUT_SCHEMA,
    }));
  },
  async isAvailable(userId, provider, action) {
    return (
      provider === "github" &&
      (GITHUB_CONNECTED_SERVICE_ACTIONS as readonly string[]).includes(action) &&
      Boolean(await getUserGitHubInstallationId(userId))
    );
  },
  async prepare(input) {
    const installationId = await getUserGitHubInstallationId(input.userId);
    if (!installationId) throw new Error("GitHub is not connected through a GitHub App installation.");
    if (!(GITHUB_CONNECTED_SERVICE_ACTIONS as readonly string[]).includes(input.action)) {
      throw new Error(`GitHub does not expose ${input.action} through its direct adapter.`);
    }
    return {
      provider: "github",
      action: input.action,
      description: `Read ${input.action.replace(/_/g, " ")} through the user's GitHub App installation.`,
      risk: "low",
      requiresApproval: false,
      input: input.actionInput,
    };
  },
  async execute(input) {
    try {
      const installationId = await getUserGitHubInstallationId(input.userId);
      if (!installationId) {
        return {
          ok: false,
          error: "GitHub App installation is no longer available.",
          failurePhase: "pre_dispatch",
          safeToFailover: true,
        };
      }
      const data = await executeGitHubConnectedService(installationId, asGitHubInput(input.action, input.actionInput));
      return {
        ok: true,
        result: { provider: "github", action: input.action, read_only: true, transport: "github_app", data },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "GitHub direct execution failed.",
        failurePhase: "post_dispatch",
        safeToFailover: true,
      };
    }
  },
};

const salesforceOAuthAdapter: IntegrationAdapter = {
  id: "salesforce_oauth",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "salesforce",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "salesforce") return [];
    if (!(await hasSalesforceDirectConnection(userId))) return [];
    return ["accounts_search", "opportunities_search"].map((action) => ({
      provider: "salesforce",
      action,
      description: `Read ${action.replace(/_/g, " ")} through the user's Salesforce tenant API.`,
      risk: "low" as const,
      requiresApproval: false,
      deployed: true,
      inputSchema: SALESFORCE_INPUT_SCHEMA,
    }));
  },
  async isAvailable(userId, provider, action) {
    return (
      provider === "salesforce" &&
      ["accounts_search", "opportunities_search"].includes(action) &&
      (await hasSalesforceDirectConnection(userId))
    );
  },
  async prepare(input) {
    if (!["accounts_search", "opportunities_search"].includes(input.action)) {
      throw new Error(`Salesforce does not expose ${input.action} through its direct adapter.`);
    }
    const query = typeof input.actionInput["query"] === "string" ? input.actionInput["query"].trim() : "";
    if (!query) throw new Error("A Salesforce search query is required.");
    if (!(await hasSalesforceDirectConnection(input.userId))) {
      throw new Error("Salesforce is not connected through its native OAuth integration.");
    }
    return {
      provider: "salesforce",
      action: input.action,
      description: `Read ${input.action.replace(/_/g, " ")} through the user's Salesforce tenant API.`,
      risk: "low",
      requiresApproval: false,
      input: input.actionInput,
    };
  },
  async execute(input) {
    const query = typeof input.actionInput["query"] === "string" ? input.actionInput["query"] : "";
    const limit = typeof input.actionInput["limit"] === "number" ? input.actionInput["limit"] : undefined;
    try {
      const data =
        input.action === "accounts_search"
          ? await searchSalesforceAccounts({
              userId: input.userId,
              query,
              ...(limit === undefined ? {} : { limit }),
              ...(input.signal ? { signal: input.signal } : {}),
            })
          : await searchSalesforceOpportunities({
              userId: input.userId,
              query,
              limit,
              ...(input.signal ? { signal: input.signal } : {}),
            });
      return {
        ok: true,
        result: { provider: "salesforce", action: input.action, read_only: true, transport: "salesforce_oauth", data },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Salesforce direct execution failed.",
        failurePhase: "post_dispatch",
        safeToFailover: true,
      };
    }
  },
};

const nativeShopifyAdapter: IntegrationAdapter = {
  id: "native_shopify",
  lane: "direct_api",
  supportsProvider: (provider) => provider === "shopify",
  async listCapabilities(userId, provider) {
    if (provider && provider !== "shopify") return [];
    return listNativeShopifyCapabilities(userId);
  },
  async isAvailable(userId, provider, action) {
    if (provider !== "shopify" || !(await hasNativeShopifyConnection(userId))) return false;
    const capabilities = await listNativeShopifyCapabilities(userId);
    return capabilities.some((item) => item.action === action);
  },
  async prepare(input) {
    if (input.provider !== "shopify") throw new Error(`No native Shopify adapter is registered for ${input.provider}.`);
    return prepareNativeShopifyAction(input);
  },
  async execute(input) {
    try {
      const outcome = await executeNativeShopifyAction(input);
      if (outcome.ok) return { ok: true, result: outcome.result };
      return {
        ok: false,
        error: outcome.error ?? "Native Shopify execution failed.",
        failurePhase: "post_dispatch",
        safeToFailover: false,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Native Shopify execution failed.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      };
    }
  },
};

const nangoAdapter: IntegrationAdapter = {
  id: "nango",
  lane: "connector_transport",
  supportsProvider: isSafeNangoProviderId,
  async listCapabilities(userId, provider) {
    if (provider && !isSafeNangoProviderId(provider)) return [];
    return listNangoAgentCapabilities(userId, provider);
  },
  async isAvailable(userId, provider, action) {
    if (!isSafeNangoProviderId(provider)) return false;
    try {
      const capabilities = await listNangoAgentCapabilities(userId, provider);
      return capabilities.some((item) => item.action === action);
    } catch {
      return false;
    }
  },
  async prepare(input) {
    return prepareNangoAgentAction(input);
  },
  async execute(input) {
    try {
      const outcome = await executeNangoAgentAction(input);
      if (outcome.ok) return { ok: true, result: outcome.result };
      return {
        ok: false,
        error: outcome.error ?? "Nango action execution failed.",
        failurePhase: "ambiguous",
        safeToFailover: false,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Nango action execution failed.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      };
    }
  },
};

const ADAPTERS: readonly IntegrationAdapter[] = [
  directOAuthAdapter,
  githubAppAdapter,
  salesforceOAuthAdapter,
  nativeShopifyAdapter,
  nangoAdapter,
];

export function integrationAdapters(): readonly IntegrationAdapter[] {
  return ADAPTERS;
}

export function integrationAdapterById(id: string): IntegrationAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.id === id);
}
