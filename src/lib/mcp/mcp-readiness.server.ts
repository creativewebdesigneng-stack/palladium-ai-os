import { runtimeMcpSupabaseProjectRef } from "./oauth-config";

type FetchLike = typeof fetch;

type ProbeRequest = {
  response: Response | null;
  latencyMs: number | null;
  error: string | null;
};

const DEFAULT_BLACKSTAR_ORIGIN = "https://palladium-ai-os.vercel.app";

function runtimeOrigin() {
  const raw =
    process.env["VERCEL_URL"] ??
    process.env["VERCEL_PROJECT_PRODUCTION_URL"] ??
    DEFAULT_BLACKSTAR_ORIGIN;

  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

function privateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.")
  ) {
    return true;
  }

  const match = host.match(/^172\.(\d{1,3})\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

export function normalizeMcpProbeOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Blackstar MCP readiness probes require HTTPS.");
  }
  if (privateHostname(url.hostname)) {
    throw new Error("Blackstar MCP readiness probes cannot target private hosts.");
  }
  return url.origin;
}

async function boundedGet(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<ProbeRequest> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    return {
      response,
      latencyMs: Date.now() - started,
      error: null,
    };
  } catch (error) {
    return {
      response: null,
      latencyMs: null,
      error: error instanceof Error ? error.message.slice(0, 180) : "request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

function transportReady(response: Response | null) {
  if (!response) return false;

  if (response.status === 405) {
    const allow = response.headers.get("allow")?.toUpperCase() ?? "";
    return allow.split(",").some((method) => method.trim() === "POST");
  }

  if (response.status === 401) {
    return Boolean(response.headers.get("www-authenticate"));
  }

  return false;
}

export async function probeBlackstarMcpRemoteIdentity(options?: {
  origin?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}) {
  const checkedAt = new Date().toISOString();
  const timeoutMs = Math.max(500, Math.min(options?.timeoutMs ?? 6_000, 15_000));
  const fetchImpl = options?.fetchImpl ?? fetch;

  let origin: string;
  try {
    origin = normalizeMcpProbeOrigin(options?.origin ?? runtimeOrigin());
  } catch (error) {
    return {
      name: "Blackstar remote MCP",
      provider: "blackstar-remote-mcp",
      configured: false,
      reachable: false,
      healthy: false,
      readySignal: false,
      httpStatus: null,
      latencyMs: null,
      checkedAt,
      error: error instanceof Error ? error.message : "invalid MCP origin",
    };
  }

  const issuer = `https://${runtimeMcpSupabaseProjectRef()}.supabase.co/auth/v1`;
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource`;
  const transportUrl = `${origin}/mcp`;

  const [metadataRequest, transportRequest] = await Promise.all([
    boundedGet(fetchImpl, metadataUrl, timeoutMs),
    boundedGet(fetchImpl, transportUrl, timeoutMs),
  ]);

  let metadataValid = false;
  let metadataError: string | null = metadataRequest.error;

  if (metadataRequest.response) {
    try {
      const payload = await metadataRequest.response.json() as Record<string, unknown>;
      const authorizationServers = Array.isArray(payload["authorization_servers"])
        ? payload["authorization_servers"].filter((value): value is string => typeof value === "string")
        : [];
      const bearerMethods = Array.isArray(payload["bearer_methods_supported"])
        ? payload["bearer_methods_supported"].filter((value): value is string => typeof value === "string")
        : [];

      metadataValid =
        metadataRequest.response.status === 200 &&
        payload["resource"] === `${origin}/mcp` &&
        payload["resource_name"] === "Blackstar" &&
        authorizationServers.includes(issuer) &&
        bearerMethods.includes("header");

      if (!metadataValid) {
        metadataError = "OAuth protected-resource metadata did not match the Blackstar MCP contract.";
      }
    } catch {
      metadataError = "OAuth protected-resource metadata was not valid JSON.";
    }
  }

  const transportValid = transportReady(transportRequest.response);
  const reachable = Boolean(metadataRequest.response || transportRequest.response);
  const healthy = metadataValid && transportValid;
  const errors = [
    metadataError,
    transportRequest.error,
    transportRequest.response && !transportValid
      ? `MCP GET contract returned HTTP ${transportRequest.response.status} without the expected stateless POST/auth signal.`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    name: "Blackstar remote MCP",
    provider: "blackstar-remote-mcp",
    configured: true,
    reachable,
    healthy,
    readySignal: healthy,
    httpStatus: metadataRequest.response?.status ?? transportRequest.response?.status ?? null,
    latencyMs: Math.max(
      metadataRequest.latencyMs ?? 0,
      transportRequest.latencyMs ?? 0,
    ) || null,
    checkedAt,
    error: errors.length ? errors.join(" ").slice(0, 240) : null,
  };
}
