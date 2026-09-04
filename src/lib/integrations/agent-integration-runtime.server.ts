/**
 * Provider-neutral agent integration runtime.
 *
 * The agent runtime talks only to this module. Provider credentials and
 * transport-specific behavior stay behind registered server-side adapters.
 */
import type { ExecutionLane } from "./capability-catalog";
import { resolveExecutionRoute } from "./execution-fabric.server";
import {
  integrationAdapterById,
  integrationAdapters,
  type IntegrationActionRisk,
  type IntegrationAdapter,
  type IntegrationAdapterId,
} from "./integration-adapters.server";

export const INTEGRATION_TRANSPORTS = [
  "direct_oauth",
  "github_app",
  "salesforce_oauth",
  "native_shopify",
  "nango",
] as const;
export type IntegrationTransport = IntegrationAdapterId;

export type IntegrationCapability = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  deployed: boolean;
  inputSchema: Record<string, unknown>;
  transport: IntegrationTransport;
  lane: ExecutionLane;
};

export type PreparedIntegrationAction = {
  provider: string;
  action: string;
  description: string;
  risk: IntegrationActionRisk;
  requiresApproval: boolean;
  input: Record<string, unknown>;
  transport: IntegrationTransport;
  lane: ExecutionLane;
};

export type IntegrationExecutionAttempt = {
  lane: ExecutionLane;
  transport: IntegrationTransport;
  ok: boolean;
  error?: string;
  failurePhase?: "pre_dispatch" | "post_dispatch" | "ambiguous";
  safeToFailover?: boolean;
};

export type IntegrationExecutionResult = {
  ok: boolean;
  provider: string;
  transport?: IntegrationTransport;
  lane?: ExecutionLane;
  result?: unknown;
  error?: string;
  attempts: IntegrationExecutionAttempt[];
};

/** Accepts both neutral (`slack`) and legacy prefixed (`nango_slack`) IDs. */
export function normalizeIntegrationProvider(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "";
}

export function isIntegrationTransport(value: unknown): value is IntegrationTransport {
  return typeof value === "string" && Boolean(integrationAdapterById(value));
}

async function availableAdapters(input: {
  userId: string;
  provider: string;
  action: string;
}): Promise<IntegrationAdapter[]> {
  const available: IntegrationAdapter[] = [];
  for (const adapter of integrationAdapters()) {
    if (!adapter.supportsProvider(input.provider)) continue;
    if (await adapter.isAvailable(input.userId, input.provider, input.action)) {
      available.push(adapter);
    }
  }
  return available;
}

function orderAdapters(provider: string, adapters: readonly IntegrationAdapter[]): IntegrationAdapter[] {
  const availability = {
    directApi: adapters.some((adapter) => adapter.lane === "direct_api"),
    connectorTransport: adapters.some((adapter) => adapter.lane === "connector_transport"),
    browser: adapters.some((adapter) => adapter.lane === "browser"),
    desktopWorker: adapters.some((adapter) => adapter.lane === "desktop_worker"),
  };
  const route = resolveExecutionRoute({ provider, availability });
  return route.lanes.flatMap((lane) => adapters.filter((adapter) => adapter.lane === lane));
}

/**
 * Resolves the preferred live server-side transport for compatibility with old
 * callers. When no user/action context is available this returns the first
 * registered provider adapter, not a fabricated connection state.
 */
export function resolveIntegrationTransport(provider: string): IntegrationTransport {
  const normalized = normalizeIntegrationProvider(provider);
  const adapter = integrationAdapters().find((item) => item.supportsProvider(normalized));
  return adapter?.id ?? "nango";
}

function appendCapabilities(
  rows: IntegrationCapability[],
  adapter: IntegrationAdapter,
  capabilities: Awaited<ReturnType<IntegrationAdapter["listCapabilities"]>>,
): void {
  for (const capability of capabilities) {
    rows.push({
      ...capability,
      provider: normalizeIntegrationProvider(capability.provider),
      transport: adapter.id,
      lane: adapter.lane,
    });
  }
}

/** Live, typed actions exposed by the authenticated user's actual connections. */
export async function listIntegrationCapabilities(
  userId: string,
  provider?: string,
): Promise<IntegrationCapability[]> {
  const normalized = normalizeIntegrationProvider(provider);
  const rows: IntegrationCapability[] = [];
  for (const adapter of integrationAdapters()) {
    if (normalized && !adapter.supportsProvider(normalized)) continue;
    appendCapabilities(rows, adapter, await adapter.listCapabilities(userId, normalized || undefined));
  }

  // Some adapters still enumerate a fixed legacy provider set when no provider
  // is supplied. Probe native YouTube explicitly so the shared agent/workflow
  // catalogue sees the same direct capability as Social Operations. Grouping
  // below removes any duplicate connector/native entries and preserves the
  // normal direct-before-connector routing preference.
  if (!normalized) {
    for (const adapter of integrationAdapters()) {
      if (!adapter.supportsProvider("youtube")) continue;
      appendCapabilities(rows, adapter, await adapter.listCapabilities(userId, "youtube"));
    }
  }

  // One logical provider/action should be advertised once. Prefer the route the
  // runtime itself would choose (direct API before connector transport).
  const grouped = new Map<string, IntegrationCapability[]>();
  for (const row of rows) {
    const key = `${row.provider}:${row.action}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  const selected: IntegrationCapability[] = [];
  for (const group of grouped.values()) {
    const ordered = orderAdapters(
      group[0]!.provider,
      group
        .map((row) => integrationAdapterById(row.transport))
        .filter((item): item is IntegrationAdapter => Boolean(item)),
    );
    const preferred = ordered[0];
    selected.push(group.find((row) => row.transport === preferred?.id) ?? group[0]!);
  }
  return selected.sort((left, right) =>
    left.provider === right.provider
      ? left.action.localeCompare(right.action)
      : left.provider.localeCompare(right.provider),
  );
}

/** Validates, classifies and binds an action to the preferred live adapter. */
export async function prepareIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedIntegrationAction> {
  const provider = normalizeIntegrationProvider(input.provider);
  if (!provider) throw new Error("An integration provider is required.");
  const candidates = orderAdapters(
    provider,
    await availableAdapters({ userId: input.userId, provider, action: input.action }),
  );
  if (!candidates.length) {
    throw new Error(`${provider} does not have a live execution lane for ${input.action}.`);
  }

  let lastError: unknown;
  for (const adapter of candidates) {
    try {
      const prepared = await adapter.prepare({ ...input, provider });
      return {
        provider: normalizeIntegrationProvider(prepared.provider),
        action: prepared.action,
        description: prepared.description,
        risk: prepared.risk,
        requiresApproval: prepared.requiresApproval,
        input: prepared.input,
        transport: adapter.id,
        lane: adapter.lane,
      };
    } catch (error) {
      lastError = error;
      // Preparation is pre-dispatch, so trying the next live adapter cannot
      // duplicate an external side effect.
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${provider} action preparation failed.`);
}

/**
 * Executes through the preferred live lane and fails over only when the adapter
 * explicitly marks replay as safe. If a transport was persisted with an
 * approved action, execution is pinned to that exact adapter.
 */
export async function executeIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  transport?: string;
  signal?: AbortSignal;
}): Promise<IntegrationExecutionResult> {
  const provider = normalizeIntegrationProvider(input.provider);
  const requested = isIntegrationTransport(input.transport) ? input.transport : null;
  let candidates: IntegrationAdapter[];

  if (requested) {
    const adapter = integrationAdapterById(requested);
    candidates = adapter ? [adapter] : [];
  } else {
    candidates = orderAdapters(
      provider,
      await availableAdapters({ userId: input.userId, provider, action: input.action }),
    );
  }

  if (!candidates.length) {
    return {
      ok: false,
      provider,
      error: requested
        ? `The recorded integration transport "${requested}" is unavailable.`
        : `${provider} does not have a live execution lane for ${input.action}.`,
      attempts: [],
    };
  }

  const attempts: IntegrationExecutionAttempt[] = [];
  for (const adapter of candidates) {
    if (!(await adapter.isAvailable(input.userId, provider, input.action))) {
      attempts.push({
        lane: adapter.lane,
        transport: adapter.id,
        ok: false,
        error: "Adapter is no longer available for this provider/action.",
        failurePhase: "pre_dispatch",
        safeToFailover: true,
      });
      if (requested) break;
      continue;
    }

    const outcome = await adapter.execute({
      userId: input.userId,
      provider,
      action: input.action,
      actionInput: input.actionInput,
      ...(input.signal ? { signal: input.signal } : {}),
    });
    if (outcome.ok) {
      attempts.push({ lane: adapter.lane, transport: adapter.id, ok: true });
      return {
        ok: true,
        provider,
        transport: adapter.id,
        lane: adapter.lane,
        result: outcome.result,
        attempts,
      };
    }

    attempts.push({
      lane: adapter.lane,
      transport: adapter.id,
      ok: false,
      error: outcome.error,
      failurePhase: outcome.failurePhase,
      safeToFailover: outcome.safeToFailover,
    });
    if (requested || !outcome.safeToFailover) {
      return {
        ok: false,
        provider,
        transport: adapter.id,
        lane: adapter.lane,
        error: outcome.error,
        attempts,
      };
    }
  }

  const last = attempts[attempts.length - 1];
  return {
    ok: false,
    provider,
    ...(last ? { transport: last.transport, lane: last.lane, error: last.error } : {}),
    attempts,
  };
}
