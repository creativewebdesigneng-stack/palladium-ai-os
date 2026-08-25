import {
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";

/**
 * Provider-neutral integration capability contract used by the agent runtime.
 *
 * Nango is currently the first dynamic action transport, but callers must not
 * depend on that implementation detail. Additional transports can be added to
 * the registry below (native provider APIs, Composio, Pipedream, etc.) without
 * changing the agent-facing capability/action contract.
 */
export type AgentIntegrationRisk = NangoActionRisk;

export type AgentIntegrationCapability = {
  provider: string;
  action: string;
  description: string;
  risk: AgentIntegrationRisk;
  requiresApproval: boolean;
  available: boolean;
  inputSchema: Record<string, unknown>;
  transport: string;
};

export type PreparedAgentIntegrationAction = {
  provider: string;
  action: string;
  description: string;
  risk: AgentIntegrationRisk;
  requiresApproval: boolean;
  input: Record<string, unknown>;
  transport: string;
};

type CapabilityTransport = {
  id: string;
  listCapabilities: (userId: string, provider?: string) => Promise<AgentIntegrationCapability[]>;
  prepareAction: (input: {
    userId: string;
    provider: string;
    action: string;
    actionInput: Record<string, unknown>;
  }) => Promise<PreparedAgentIntegrationAction>;
  executeAction: (input: {
    userId: string;
    provider: string;
    action: string;
    actionInput: Record<string, unknown>;
    signal?: AbortSignal;
  }) => Promise<unknown>;
};

const nangoTransport: CapabilityTransport = {
  id: "nango",
  async listCapabilities(userId, provider) {
    const capabilities = await listNangoAgentCapabilities(userId, provider);
    return capabilities.map((capability) => ({
      provider: capability.provider,
      action: capability.action,
      description: capability.description,
      risk: capability.risk,
      requiresApproval: capability.requiresApproval,
      available: capability.deployed,
      inputSchema: capability.inputSchema,
      transport: "nango",
    }));
  },
  async prepareAction(input) {
    const prepared = await prepareNangoAgentAction(input);
    return { ...prepared, transport: "nango" };
  },
  executeAction: executeNangoAgentAction,
};

const TRANSPORTS: readonly CapabilityTransport[] = [nangoTransport];

function normalizeProvider(value: string) {
  return value.trim().toLowerCase().replace(/^nango_/, "");
}

async function firstTransportForAction(input: {
  userId: string;
  provider: string;
  action: string;
}) {
  const provider = normalizeProvider(input.provider);
  if (!provider) throw new Error("An integration provider is required.");

  for (const transport of TRANSPORTS) {
    try {
      const capabilities = await transport.listCapabilities(input.userId, provider);
      if (capabilities.some((capability) => capability.action === input.action)) {
        return { transport, provider };
      }
    } catch {
      // A transport that does not own this provider/action is not fatal; try the next adapter.
    }
  }

  throw new Error(
    `No connected integration transport advertises action "${input.action}" for provider "${provider}".`,
  );
}

export async function listAgentIntegrationCapabilities(userId: string, provider?: string) {
  const normalizedProvider = provider ? normalizeProvider(provider) : undefined;
  const groups = await Promise.all(
    TRANSPORTS.map((transport) =>
      transport.listCapabilities(userId, normalizedProvider).catch(() => []),
    ),
  );

  const deduped = new Map<string, AgentIntegrationCapability>();
  for (const capability of groups.flat()) {
    const key = `${capability.provider}:${capability.action}`;
    if (!deduped.has(key)) deduped.set(key, capability);
  }

  return [...deduped.values()].sort((left, right) =>
    left.provider === right.provider
      ? left.action.localeCompare(right.action)
      : left.provider.localeCompare(right.provider),
  );
}

export async function prepareAgentIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  const resolved = await firstTransportForAction(input);
  return resolved.transport.prepareAction({ ...input, provider: resolved.provider });
}

export async function executeAgentIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const resolved = await firstTransportForAction(input);
  return resolved.transport.executeAction({ ...input, provider: resolved.provider });
}
