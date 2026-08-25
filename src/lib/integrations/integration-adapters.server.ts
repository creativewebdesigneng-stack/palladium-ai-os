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
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";
import { isSafeNangoProviderId } from "./nango-providers";
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
export type IntegrationAdapterId = "direct_oauth" | "github_app" | "salesforce_oauth" | "nango";

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
    ref: { type: "string", maxLength: 250 },
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
  supportsProvider: isDirectConnectedServiceProvider,
  async listCapabilities(userId, provider) {
    const providers = provider
      ? [provider]
      : ["google", "microsoft", "slack", "hubspot", "notion", "asana", "linear"];
    const rows: AdapterCapability[] = [];
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
    return (
      isDirectConnectedServiceProvider(provider) &&
      directConnectedServiceActions(provider).includes(action) &&
      (await hasDirectConnectedService(userId, provider))
    );
  },
  async prepare(input) {
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
      const data = await executeGitHubConnectedService(
        installationId,
        asGitHubInput(input.action, input.actionInput),
      );
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
              ...(limit === undefined ? {} : { limit }),
              ...(input.signal ? { signal: input.signal } : {}),
            });
      return {
        ok: true,
        result: {
          provider: "salesforce",
          action: input.action,
          read_only: true,
          transport: "salesforce_oauth",
          data,
        },
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
  nangoAdapter,
];

export function integrationAdapters(): readonly IntegrationAdapter[] {
  return ADAPTERS;
}

export function integrationAdapterById(id: string): IntegrationAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.id === id);
}
