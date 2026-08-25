/**
 * Provider-neutral agent integration runtime.
 *
 * The agent runtime does not know which transport reaches a connected provider.
 * Native APIs are preferred when PalladiumAI owns a first-class adapter; connector
 * transports such as Nango remain fallbacks. Credentials stay server-side.
 */
import { isSafeNangoProviderId } from "./nango-providers";
import {
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";
import {
  executeNativeShopifyAction,
  hasNativeShopifyConnection,
  listNativeShopifyCapabilities,
  prepareNativeShopifyAction,
} from "./shopify.server";

export const INTEGRATION_TRANSPORTS = ["native", "nango"] as const;
export type IntegrationTransport = (typeof INTEGRATION_TRANSPORTS)[number];
export type IntegrationActionRisk = NangoActionRisk;

export type IntegrationCapability = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  deployed: boolean;
  inputSchema: Record<string, unknown>;
  transport: IntegrationTransport;
};

export type PreparedIntegrationAction = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  input: Record<string, unknown>;
  transport: IntegrationTransport;
};

export function normalizeIntegrationProvider(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "";
}

export function isIntegrationTransport(value: unknown): value is IntegrationTransport {
  return typeof value === "string" && (INTEGRATION_TRANSPORTS as readonly string[]).includes(value);
}

/** Static hint only. User-aware preparation below chooses native vs connector. */
export function resolveIntegrationTransport(provider: string): IntegrationTransport {
  const normalized = normalizeIntegrationProvider(provider);
  if (normalized === "shopify") return "native";
  if (isSafeNangoProviderId(normalized)) return "nango";
  return "nango";
}

function capabilityKey(capability: { provider: string; action: string }) {
  return `${normalizeIntegrationProvider(capability.provider)}:${capability.action}`;
}

/** Live typed actions across every transport, de-duplicated with native first. */
export async function listIntegrationCapabilities(
  userId: string,
  provider?: string,
): Promise<IntegrationCapability[]> {
  const normalized = normalizeIntegrationProvider(provider);
  const native = !normalized || normalized === "shopify"
    ? await listNativeShopifyCapabilities(userId)
    : [];
  const nango = await listNangoAgentCapabilities(userId, normalized || undefined).catch(() => []);
  const merged = new Map<string, IntegrationCapability>();
  for (const capability of native) merged.set(capabilityKey(capability), capability);
  for (const capability of nango) {
    const item: IntegrationCapability = {
      ...capability,
      provider: normalizeIntegrationProvider(capability.provider),
      transport: "nango",
    };
    if (!merged.has(capabilityKey(item))) merged.set(capabilityKey(item), item);
  }
  return [...merged.values()].sort((a, b) =>
    a.provider === b.provider ? a.action.localeCompare(b.action) : a.provider.localeCompare(b.provider),
  );
}

/** Validates/classifies without touching the provider. Native Shopify wins when connected. */
export async function prepareIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedIntegrationAction> {
  const provider = normalizeIntegrationProvider(input.provider);
  if (provider === "shopify" && await hasNativeShopifyConnection(input.userId)) {
    return prepareNativeShopifyAction({
      userId: input.userId,
      action: input.action,
      actionInput: input.actionInput,
    });
  }
  const prepared = await prepareNangoAgentAction({
    userId: input.userId,
    provider,
    action: input.action,
    actionInput: input.actionInput,
  });
  return {
    provider: normalizeIntegrationProvider(prepared.provider),
    action: prepared.action,
    description: prepared.description,
    risk: prepared.risk,
    requiresApproval: prepared.requiresApproval,
    input: prepared.input,
    transport: "nango",
  };
}

/** Executes through the transport stored in the prepared/approved action. */
export async function executeIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  transport?: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; provider: string; transport: IntegrationTransport; result?: unknown; error?: string }> {
  const provider = normalizeIntegrationProvider(input.provider);
  const transport = isIntegrationTransport(input.transport)
    ? input.transport
    : provider === "shopify" && await hasNativeShopifyConnection(input.userId)
      ? "native"
      : "nango";
  try {
    if (transport === "native") {
      if (provider !== "shopify") throw new Error(`No native integration adapter is registered for "${provider}".`);
      const outcome = await executeNativeShopifyAction({
        userId: input.userId,
        action: input.action,
        actionInput: input.actionInput,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      return { ...outcome, provider, transport };
    }
    const outcome = await executeNangoAgentAction({
      userId: input.userId,
      provider,
      action: input.action,
      actionInput: input.actionInput,
      ...(input.signal ? { signal: input.signal } : {}),
    });
    return { ...outcome, provider: normalizeIntegrationProvider(outcome.provider), transport: "nango" };
  } catch (error) {
    return {
      ok: false,
      provider,
      transport,
      error: error instanceof Error ? error.message : "Integration action execution failed.",
    };
  }
}
