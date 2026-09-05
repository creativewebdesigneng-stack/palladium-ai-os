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
import { instagramIntegrationAdapter } from "./instagram-integration-adapter.server";
import { threadsIntegrationAdapter } from "./threads-integration-adapter.server";
import {
  YOUTUBE_VIDEO_ACTION,
  YOUTUBE_VIDEO_INPUT_SCHEMA,
  hasNativeYouTubeUploadConnection,
  prepareYouTubeVideoAction,
  uploadYouTubeTrustedVideo,
} from "./youtube-video-actions.server";
import {
  TIKTOK_VIDEO_ACTION,
  TIKTOK_VIDEO_INPUT_SCHEMA,
  prepareTikTokVideoAction,
  publishTikTokTrustedVideo,
} from "./tiktok-video-actions.server";
import { getIntegrationAccessToken } from "./oauth.server";

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

const EXTENSION_ADAPTERS: readonly IntegrationAdapter[] = [
  instagramIntegrationAdapter,
  threadsIntegrationAdapter,
];

function runtimeAdapters(): readonly IntegrationAdapter[] {
  return [...integrationAdapters(), ...EXTENSION_ADAPTERS];
}

function runtimeAdapterById(id: string, provider?: string): IntegrationAdapter | undefined {
  if (id === "direct_oauth" && provider === "instagram") return instagramIntegrationAdapter;
  if (id === "direct_oauth" && provider === "threads") return threadsIntegrationAdapter;
  return integrationAdapterById(id) ?? EXTENSION_ADAPTERS.find((adapter) => adapter.id === id);
}

/** Accepts both neutral (`slack`) and legacy prefixed (`nango_slack`) IDs. */
export function normalizeIntegrationProvider(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "";
}

export function isIntegrationTransport(value: unknown): value is IntegrationTransport {
  return typeof value === "string" && Boolean(runtimeAdapterById(value));
}

async function availableAdapters(input: {
  userId: string;
  provider: string;
  action: string;
}): Promise<IntegrationAdapter[]> {
  const available: IntegrationAdapter[] = [];
  for (const adapter of runtimeAdapters()) {
    if (!adapter.supportsProvider(input.provider)) continue;
    if (await adapter.isAvailable(input.userId, input.provider, input.action)) available.push(adapter);
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

export function resolveIntegrationTransport(provider: string): IntegrationTransport {
  const normalized = normalizeIntegrationProvider(provider);
  const adapter = runtimeAdapters().find((item) => item.supportsProvider(normalized));
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

async function appendNativeVideoCapabilities(rows: IntegrationCapability[], userId: string, provider: string): Promise<void> {
  if ((provider === "" || provider === "youtube") && await hasNativeYouTubeUploadConnection(userId)) {
    rows.push({
      provider: "youtube",
      action: YOUTUBE_VIDEO_ACTION,
      description: "Upload an approved trusted MP4 video to the connected YouTube channel through the native resumable upload API.",
      risk: "medium",
      requiresApproval: true,
      deployed: true,
      inputSchema: YOUTUBE_VIDEO_INPUT_SCHEMA,
      transport: "direct_oauth",
      lane: "direct_api",
    });
  }
  if ((provider === "" || provider === "tiktok") && Boolean(await getIntegrationAccessToken(userId, "tiktok"))) {
    rows.push({
      provider: "tiktok",
      action: TIKTOK_VIDEO_ACTION,
      description: "Publish an approved trusted MP4 video to TikTok through Direct Post using current creator controls.",
      risk: "medium",
      requiresApproval: true,
      deployed: true,
      inputSchema: TIKTOK_VIDEO_INPUT_SCHEMA,
      transport: "direct_oauth",
      lane: "direct_api",
    });
  }
}

export async function listIntegrationCapabilities(userId: string, provider?: string): Promise<IntegrationCapability[]> {
  const normalized = normalizeIntegrationProvider(provider);
  const rows: IntegrationCapability[] = [];
  for (const adapter of runtimeAdapters()) {
    if (normalized && !adapter.supportsProvider(normalized)) continue;
    appendCapabilities(rows, adapter, await adapter.listCapabilities(userId, normalized || undefined));
  }
  if (!normalized) {
    for (const adapter of runtimeAdapters()) {
      if (!adapter.supportsProvider("youtube")) continue;
      appendCapabilities(rows, adapter, await adapter.listCapabilities(userId, "youtube"));
    }
  }
  await appendNativeVideoCapabilities(rows, userId, normalized);

  const grouped = new Map<string, IntegrationCapability[]>();
  for (const row of rows) {
    const key = `${row.provider}:${row.action}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  const selected: IntegrationCapability[] = [];
  for (const group of grouped.values()) {
    if (group.some((row) => row.action === YOUTUBE_VIDEO_ACTION || row.action === TIKTOK_VIDEO_ACTION)) {
      selected.push(group.find((row) => row.transport === "direct_oauth") ?? group[0]!);
      continue;
    }
    const ordered = orderAdapters(
      group[0]!.provider,
      group.map((row) => runtimeAdapterById(row.transport, row.provider)).filter((item): item is IntegrationAdapter => Boolean(item)),
    );
    const preferred = ordered[0];
    selected.push(group.find((row) => row.transport === preferred?.id) ?? group[0]!);
  }
  return selected.sort((left, right) => left.provider === right.provider ? left.action.localeCompare(right.action) : left.provider.localeCompare(right.provider));
}

export async function prepareIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedIntegrationAction> {
  const provider = normalizeIntegrationProvider(input.provider);
  if (!provider) throw new Error("An integration provider is required.");

  if (provider === "youtube" && input.action === YOUTUBE_VIDEO_ACTION) {
    const prepared = await prepareYouTubeVideoAction({ ...input, provider });
    return { ...prepared, transport: "direct_oauth", lane: "direct_api" };
  }
  if (provider === "tiktok" && input.action === TIKTOK_VIDEO_ACTION) {
    const prepared = await prepareTikTokVideoAction({ ...input, provider });
    return { ...prepared, transport: "direct_oauth", lane: "direct_api" };
  }

  const candidates = orderAdapters(provider, await availableAdapters({ userId: input.userId, provider, action: input.action }));
  if (!candidates.length) throw new Error(`${provider} does not have a live execution lane for ${input.action}.`);

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
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider} action preparation failed.`);
}

async function executeNativeVideoAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  transport?: string;
  signal?: AbortSignal;
}): Promise<IntegrationExecutionResult | null> {
  const isYouTube = input.provider === "youtube" && input.action === YOUTUBE_VIDEO_ACTION;
  const isTikTok = input.provider === "tiktok" && input.action === TIKTOK_VIDEO_ACTION;
  if (!isYouTube && !isTikTok) return null;
  if (input.transport && input.transport !== "direct_oauth") {
    return { ok: false, provider: input.provider, error: `The recorded integration transport "${input.transport}" is unavailable for this native video action.`, attempts: [] };
  }
  try {
    const data = isYouTube
      ? await uploadYouTubeTrustedVideo({
          userId: input.userId,
          assetId: String(input.actionInput["asset_id"] ?? ""),
          title: String(input.actionInput["title"] ?? ""),
          description: String(input.actionInput["description"] ?? ""),
          privacyStatus: String(input.actionInput["privacy_status"] ?? "private"),
          madeForKids: input.actionInput["made_for_kids"] === true,
          ...(input.signal ? { signal: input.signal } : {}),
        })
      : await publishTikTokTrustedVideo({
          userId: input.userId,
          assetId: String(input.actionInput["asset_id"] ?? ""),
          privacyLevel: String(input.actionInput["privacy_level"] ?? ""),
          allowComment: input.actionInput["allow_comment"] === true,
          allowDuet: input.actionInput["allow_duet"] === true,
          allowStitch: input.actionInput["allow_stitch"] === true,
          brandContent: input.actionInput["brand_content"] === true,
          brandOrganic: input.actionInput["brand_organic"] === true,
          isAigc: input.actionInput["is_aigc"] === true,
          title: String(input.actionInput["title"] ?? ""),
          ...(input.signal ? { signal: input.signal } : {}),
        });
    return {
      ok: true,
      provider: input.provider,
      transport: "direct_oauth",
      lane: "direct_api",
      result: { provider: input.provider, action: input.action, read_only: false, transport: "direct_oauth", data },
      attempts: [{ lane: "direct_api", transport: "direct_oauth", ok: true }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Native social video publishing failed.";
    return {
      ok: false,
      provider: input.provider,
      transport: "direct_oauth",
      lane: "direct_api",
      error: message,
      attempts: [{ lane: "direct_api", transport: "direct_oauth", ok: false, error: message, failurePhase: "ambiguous", safeToFailover: false }],
    };
  }
}

export async function executeIntegrationAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
  transport?: string;
  signal?: AbortSignal;
}): Promise<IntegrationExecutionResult> {
  const provider = normalizeIntegrationProvider(input.provider);
  const nativeVideo = await executeNativeVideoAction({ ...input, provider });
  if (nativeVideo) return nativeVideo;

  const requested = isIntegrationTransport(input.transport) ? input.transport : null;
  let candidates: IntegrationAdapter[];
  if (requested) {
    const adapter = runtimeAdapterById(requested, provider);
    candidates = adapter ? [adapter] : [];
  } else {
    candidates = orderAdapters(provider, await availableAdapters({ userId: input.userId, provider, action: input.action }));
  }
  if (!candidates.length) {
    return {
      ok: false,
      provider,
      error: requested ? `The recorded integration transport "${requested}" is unavailable.` : `${provider} does not have a live execution lane for ${input.action}.`,
      attempts: [],
    };
  }

  const attempts: IntegrationExecutionAttempt[] = [];
  for (const adapter of candidates) {
    if (!(await adapter.isAvailable(input.userId, provider, input.action))) {
      attempts.push({ lane: adapter.lane, transport: adapter.id, ok: false, error: "Adapter is no longer available for this provider/action.", failurePhase: "pre_dispatch", safeToFailover: true });
      if (requested) break;
      continue;
    }
    const outcome = await adapter.execute({ userId: input.userId, provider, action: input.action, actionInput: input.actionInput, ...(input.signal ? { signal: input.signal } : {}) });
    if (outcome.ok) {
      attempts.push({ lane: adapter.lane, transport: adapter.id, ok: true });
      return { ok: true, provider, transport: adapter.id, lane: adapter.lane, result: outcome.result, attempts };
    }
    attempts.push({ lane: adapter.lane, transport: adapter.id, ok: false, error: outcome.error, failurePhase: outcome.failurePhase, safeToFailover: outcome.safeToFailover });
    if (requested || !outcome.safeToFailover) return { ok: false, provider, transport: adapter.id, lane: adapter.lane, error: outcome.error, attempts };
  }
  const last = attempts[attempts.length - 1];
  return { ok: false, provider, ...(last ? { transport: last.transport, lane: last.lane, error: last.error } : {}), attempts };
}
