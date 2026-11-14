/**
 * Optional clients for a separately hosted AgentMemory REST server and an
 * OpenViking HTTP server. Both stay disabled until their env vars are present
 * and the URL is HTTPS or localhost. Nothing here copies either project, and
 * nothing is called during a normal memory read.
 *
 * AgentMemory: https://github.com/rohitg00/agentmemory — REST under `/agentmemory/*`.
 * OpenViking: user-key auth and `POST /api/v1/search/find`. Searches are pinned
 * to the caller home alias `viking://~/memories` so this client never sends
 * another tenant's URI. A root key is not a supported configuration.
 */

export type ExternalMemoryMode = "not-connected" | "configured";

export type ExternalMemoryState = {
  mode: ExternalMemoryMode;
  reason: string;
};

export type ExternalMemoryHit = {
  id: string;
  content: string;
  score: number | null;
  source: "agentmemory" | "openviking";
};

type FetchLike = typeof fetch;

const HOME_MEMORY_URI = "viking://~/memories";

function enabledUrl(
  value: string | undefined,
  label: string,
): { ok: true; url: URL } | { ok: false; reason: string } {
  const raw = value?.trim() ?? "";
  if (!raw) return { ok: false, reason: `${label} URL is not configured.` };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `${label} URL is invalid.` };
  }
  if (url.username || url.password || url.search || url.hash) {
    return {
      ok: false,
      reason: `${label} URL must not include credentials, a query, or a fragment.`,
    };
  }
  const local =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol === "http:" && local) return { ok: true, url };
  if (url.protocol === "https:") return { ok: true, url };
  return { ok: false, reason: `${label} must use HTTPS, or HTTP only on localhost.` };
}

function tenantProject(tenantId: string): string {
  const tenant = tenantId.trim();
  if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(tenant)) {
    throw new Error("A tenant id is required before calling an external memory adapter.");
  }
  return `blackstar:${tenant}`;
}

export function externalMemoryServiceStates(env: NodeJS.ProcessEnv = process.env): {
  agentmemory: ExternalMemoryState;
  openviking: ExternalMemoryState;
} {
  const agentUrl = enabledUrl(env["AGENTMEMORY_BASE_URL"], "AgentMemory");
  const agentSecret = Boolean(env["AGENTMEMORY_SECRET"]?.trim());
  const vikingUrl = enabledUrl(env["OPENVKING_BASE_URL"], "OpenViking");
  const vikingKey = Boolean(env["OPENVKING_API_KEY"]?.trim());
  return {
    agentmemory:
      agentUrl.ok && agentSecret
        ? {
            mode: "configured",
            reason:
              "AgentMemory is configured for explicit, project-scoped calls. Blackstar does not sync memory automatically.",
          }
        : {
            mode: "not-connected",
            reason: agentUrl.ok ? "AgentMemory secret is not configured." : agentUrl.reason,
          },
    openviking:
      vikingUrl.ok && vikingKey
        ? {
            mode: "configured",
            reason:
              "OpenViking is configured for explicit user-key calls under viking://~/memories. Blackstar does not sync memory automatically.",
          }
        : {
            mode: "not-connected",
            reason: vikingUrl.ok ? "OpenViking API key is not configured." : vikingUrl.reason,
          },
  };
}

async function requestJson(args: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  fetchImpl?: FetchLike | undefined;
}): Promise<unknown> {
  const init: RequestInit = {
    method: args.method,
    headers: {
      Accept: "application/json",
      ...args.headers,
      ...(args.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    signal: AbortSignal.timeout(8_000),
  };
  if (args.body !== undefined) init.body = JSON.stringify(args.body);
  const response = await (args.fetchImpl ?? fetch)(args.url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`External memory request failed with HTTP ${response.status}.`);
  }
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hitContent(record: Record<string, unknown>): string {
  for (const key of ["content", "text", "abstract", "snippet", "title"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 4000);
  }
  return "";
}

function normaliseHits(payload: unknown, source: ExternalMemoryHit["source"]): ExternalMemoryHit[] {
  const record = asRecord(payload);
  const nested = record
    ? [
        record["memories"],
        record["results"],
        record["hits"],
        record["resources"],
        asRecord(record["result"])?.["memories"],
        asRecord(record["result"])?.["resources"],
      ]
    : [];
  const list = Array.isArray(payload) ? payload : (nested.find(Array.isArray) ?? []);
  return list.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const id =
      typeof row["id"] === "string" ? row["id"] : typeof row["uri"] === "string" ? row["uri"] : "";
    const content = hitContent(row);
    if (!id || !content) return [];
    const score =
      typeof row["score"] === "number" && Number.isFinite(row["score"]) ? row["score"] : null;
    return [{ id, content, score, source }];
  });
}

function agentConfig(env: NodeJS.ProcessEnv): { base: URL; secret: string } {
  const state = externalMemoryServiceStates(env).agentmemory;
  if (state.mode !== "configured") throw new Error(state.reason);
  const base = enabledUrl(env["AGENTMEMORY_BASE_URL"], "AgentMemory");
  if (!base.ok) throw new Error(base.reason);
  return { base: base.url, secret: env["AGENTMEMORY_SECRET"]!.trim() };
}

function vikingConfig(env: NodeJS.ProcessEnv): { base: URL; key: string } {
  const state = externalMemoryServiceStates(env).openviking;
  if (state.mode !== "configured") throw new Error(state.reason);
  const base = enabledUrl(env["OPENVKING_BASE_URL"], "OpenViking");
  if (!base.ok) throw new Error(base.reason);
  return { base: base.url, key: env["OPENVKING_API_KEY"]!.trim() };
}

export async function searchAgentMemory(args: {
  tenantId: string;
  query: string;
  limit?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<ExternalMemoryHit[]> {
  const env = args.env ?? process.env;
  const { base, secret } = agentConfig(env);
  const query = args.query.trim();
  if (!query) return [];
  const payload = await requestJson({
    url: new URL("/agentmemory/search", base).toString(),
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: {
      query,
      limit: Math.min(Math.max(args.limit ?? 5, 1), 8),
      project: tenantProject(args.tenantId),
      format: "compact",
      targetLayer: "memory",
    },
    fetchImpl: args.fetchImpl,
  });
  return normaliseHits(payload, "agentmemory");
}

export async function rememberAgentMemory(args: {
  tenantId: string;
  content: string;
  consent: true;
  agentId?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<{ id: string | null }> {
  if (args.consent !== true) throw new Error("External memory capture requires explicit consent.");
  const env = args.env ?? process.env;
  const { base, secret } = agentConfig(env);
  const content = args.content.trim();
  if (!content) throw new Error("Nothing to remember.");
  const payload = await requestJson({
    url: new URL("/agentmemory/remember", base).toString(),
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: {
      content: content.slice(0, 8000),
      project: tenantProject(args.tenantId),
      type: "semantic",
      ...(args.agentId ? { agentId: args.agentId } : {}),
    },
    fetchImpl: args.fetchImpl,
  });
  const record = asRecord(payload);
  const memory = asRecord(record?.["memory"]);
  const id =
    typeof record?.["id"] === "string"
      ? record["id"]
      : typeof memory?.["id"] === "string"
        ? memory["id"]
        : null;
  return { id };
}

export async function deleteAgentMemory(args: {
  tenantId: string;
  memoryId: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<{ deleted: true }> {
  const env = args.env ?? process.env;
  const { base, secret } = agentConfig(env);
  const memoryId = args.memoryId.trim();
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(memoryId))
    throw new Error("Memory id is not valid for deletion.");
  const project = tenantProject(args.tenantId);
  const existing = await requestJson({
    url: new URL(`/agentmemory/memories/${encodeURIComponent(memoryId)}`, base).toString(),
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
    fetchImpl: args.fetchImpl,
  });
  const memory = asRecord(asRecord(existing)?.["memory"]);
  if (memory?.["project"] !== project) {
    throw new Error("Refusing to delete an external memory outside this tenant project.");
  }
  await requestJson({
    url: new URL("/agentmemory/governance/memories", base).toString(),
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
    body: { memoryIds: [memoryId], reason: "Owner deletion requested from Blackstar." },
    fetchImpl: args.fetchImpl,
  });
  return { deleted: true };
}

export function openVikingMemoryUriAllowed(uri: string): boolean {
  const prefix = `${HOME_MEMORY_URI}/`;
  if (!uri.startsWith(prefix)) return false;
  const path = uri.slice(prefix.length);
  if (
    !path ||
    path.includes("..") ||
    path.includes("\\") ||
    path.includes("@") ||
    path.includes("//")
  )
    return false;
  return /^[A-Za-z0-9_./:-]+$/.test(path);
}

export async function searchOpenViking(args: {
  query: string;
  limit?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<ExternalMemoryHit[]> {
  const env = args.env ?? process.env;
  const { base, key } = vikingConfig(env);
  const query = args.query.trim();
  if (!query) return [];
  const payload = await requestJson({
    url: new URL("/api/v1/search/find", base).toString(),
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: {
      query,
      target_uri: HOME_MEMORY_URI,
      context_type: "memory",
      limit: Math.min(Math.max(args.limit ?? 5, 1), 8),
    },
    fetchImpl: args.fetchImpl,
  });
  return normaliseHits(payload, "openviking");
}

export async function deleteOpenVikingMemory(args: {
  uri: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<{ deleted: true }> {
  if (!openVikingMemoryUriAllowed(args.uri)) {
    throw new Error("Refusing to delete an OpenViking URI outside viking://~/memories/.");
  }
  const env = args.env ?? process.env;
  const { base, key } = vikingConfig(env);
  const url = new URL("/api/v1/fs", base);
  url.searchParams.set("uri", args.uri);
  await requestJson({
    url: url.toString(),
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    fetchImpl: args.fetchImpl,
  });
  return { deleted: true };
}
