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
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";
import { isSafeNangoProviderId } from "./nango-providers";

export type IntegrationActionRisk = NangoActionRisk;
export type IntegrationAdapterId = "direct_oauth" | "nango";

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
      // Every action exposed by this adapter is read-only, so replay through a
      // connector transport is safe even if the native request reached the API.
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Direct API execution failed.",
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
      // The Nango execution helper may already have dispatched the remote
      // action when it returns ok:false. Never replay that automatically.
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

const ADAPTERS: readonly IntegrationAdapter[] = [directOAuthAdapter, nangoAdapter];

export function integrationAdapters(): readonly IntegrationAdapter[] {
  return ADAPTERS;
}

export function integrationAdapterById(id: string): IntegrationAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.id === id);
}
