/**
 * Provider-neutral agent integration runtime.
 *
 * The agent runtime must not know which transport actually reaches a connected
 * provider. This module is the single abstraction the runtime talks to: it
 * classifies risk, prepares bounded action payloads, and executes them through
 * the transport that owns the credentials. Credentials never leave the server.
 */
import { isSafeNangoProviderId } from "./nango-providers";
import {
  executeNangoAgentAction,
  listNangoAgentCapabilities,
  prepareNangoAgentAction,
  type NangoActionRisk,
} from "./nango-capabilities.server";

/** Transports are server-side implementation details, recorded so an approved
 * action can be replayed through exactly the same path. */
export const INTEGRATION_TRANSPORTS = ["nango"] as const;
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

const DEFAULT_TRANSPORT: IntegrationTransport = "nango";

/** Accepts both neutral (`slack`) and legacy prefixed (`nango_slack`) IDs. */
export function normalizeIntegrationProvider(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "";
}

export function isIntegrationTransport(value: unknown): value is IntegrationTransport {
  return typeof value === "string" && (INTEGRATION_TRANSPORTS as readonly string[]).includes(value);
}

/** Resolves which server-side transport can reach a provider for this user. */
export function resolveIntegrationTransport(provider: string): IntegrationTransport {
  const normalized = normalizeIntegrationProvider(provider);
  if (isSafeNangoProviderId(normalized)) return "nango";
  return DEFAULT_TRANSPORT;
}

/** Live, typed actions the authenticated user's connected providers expose. */
export async function listIntegrationCapabilities(
  userId: string,
  provider?: string,
): Promise<IntegrationCapability[]> {
  const normalized = normalizeIntegrationProvider(provider);
  const capabilities = await listNangoAgentCapabilities(userId, normalized || undefined);
  return capabilities.map((capability) => ({
    ...capability,
    provider: normalizeIntegrationProvider(capability.provider),
    transport: "nango" as const,
  }));
}

/** Validates and classifies an action without touching the provider. */
export async function prepareIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedIntegrationAction> {
  const provider = normalizeIntegrationProvider(input.provider);
  const transport = resolveIntegrationTransport(provider);
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
    transport,
  };
}

/** Executes a prepared action through the recorded transport. */
export async function executeIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  transport?: string;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; provider: string; transport: IntegrationTransport; result?: unknown; error?: string }> {
  const provider = normalizeIntegrationProvider(input.provider);
  const requested = isIntegrationTransport(input.transport) ? input.transport : null;
  const transport = requested ?? resolveIntegrationTransport(provider);
  try {
    if (transport !== "nango") throw new Error(`Unsupported integration transport "${transport}".`);
    const outcome = await executeNangoAgentAction({
      userId: input.userId,
      provider,
      action: input.action,
      actionInput: input.actionInput,
      ...(input.signal ? { signal: input.signal } : {}),
    });
    return { ...outcome, provider: normalizeIntegrationProvider(outcome.provider), transport };
  } catch (error) {
    return {
      ok: false,
      provider,
      transport,
      error: error instanceof Error ? error.message : "Integration action execution failed.",
    };
  }
}
