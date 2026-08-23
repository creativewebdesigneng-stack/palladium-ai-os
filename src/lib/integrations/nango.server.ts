import {
  findNangoProvider,
  NANGO_PROVIDERS,
  nangoStorageProvider,
  type NangoProviderId,
} from "./nango-providers";

const NANGO_API = "https://api.nango.dev";
export const NANGO_GITHUB_INTEGRATION =
  process.env["NANGO_GITHUB_INTEGRATION_ID"]?.trim() || "github-getting-started";
export const NANGO_GITHUB_PROVIDER = "nango_github";

type NangoConnectionConfig = {
  connection_id?: string;
  integration_id?: string;
  provider?: string;
  environment?: string;
  auth_mode?: string;
  tags?: Record<string, string>;
};
type StoredNangoConnection = {
  id: string;
  status: string;
  account_label: string | null;
  connected_at: string | null;
  last_error: string | null;
  config: NangoConnectionConfig;
};
export type SafeNangoRequest = {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "PUT";
  headers?: Record<string, string>;
  body?: string;
};

export class NangoHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "NangoHttpError";
  }
}

function secretKey() {
  const key = process.env["NANGO_SECRET_KEY"]?.trim() || process.env["NANGO_API_KEY"]?.trim();
  if (!key)
    throw new Error("Nango is not configured. Add NANGO_SECRET_KEY to the server environment.");
  return key;
}

async function nangoFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${NANGO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok)
    throw new NangoHttpError(
      String(body?.error?.message || body?.message || `Nango returned ${response.status}.`).slice(
        0,
        300,
      ),
      response.status,
      body,
    );
  return body;
}

function connectionId(connection: any): string | null {
  const value = connection?.connection_id || connection?.id;
  return value ? String(value) : null;
}
function connectionConfig(row: any): NangoConnectionConfig {
  return row?.config && typeof row.config === "object" && !Array.isArray(row.config)
    ? row.config
    : {};
}
function configuredIntegrationId(providerId: NangoProviderId) {
  const provider = findNangoProvider(providerId)!;
  return (
    process.env[provider.env]?.trim() ||
    ("defaultIntegrationId" in provider ? provider.defaultIntegrationId : "") ||
    null
  );
}
export function nangoProviderFromIntegrationId(integrationId: string) {
  return (
    NANGO_PROVIDERS.find((provider) => configuredIntegrationId(provider.id) === integrationId) ??
    null
  );
}
export function nangoConfigured() {
  return Boolean(process.env["NANGO_SECRET_KEY"]?.trim() || process.env["NANGO_API_KEY"]?.trim());
}
export function nangoProviderConfigured(providerId: NangoProviderId) {
  return nangoConfigured() && Boolean(configuredIntegrationId(providerId));
}

export async function getPersistedNangoConnection(
  userId: string,
  providerId: NangoProviderId,
): Promise<StoredNangoConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("id,status,account_label,connected_at,last_error,config")
    .eq("user_id", userId)
    .eq("provider", nangoStorageProvider(providerId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? ({ ...data, config: connectionConfig(data) } as StoredNangoConnection) : null;
}

export async function persistNangoConnection(input: {
  userId: string;
  providerId: NangoProviderId;
  connectionId: string;
  integrationId?: string;
  provider?: string;
  environment?: string;
  authMode?: string;
  tags?: Record<string, string>;
}) {
  const definition = findNangoProvider(input.providerId)!;
  const integrationId = input.integrationId || configuredIntegrationId(input.providerId);
  if (!integrationId) throw new Error(`${definition.name} is not configured in Nango.`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const current = await getPersistedNangoConnection(input.userId, input.providerId);
  const { error } = await supabaseAdmin.from("integrations").upsert(
    {
      user_id: input.userId,
      org_id: null,
      provider: nangoStorageProvider(input.providerId),
      name: `${definition.name} via Nango`,
      integration_type: "nango",
      status: "connected",
      account_label: input.tags?.["end_user_email"] ?? current?.account_label ?? null,
      connected_at: current?.connected_at ?? now,
      last_error: null,
      config: {
        connection_id: input.connectionId,
        integration_id: integrationId,
        provider: input.provider || input.providerId,
        environment: input.environment,
        auth_mode: input.authMode,
        tags: input.tags ?? { end_user_id: input.userId },
      },
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

export async function markNangoConnectionError(input: {
  userId: string;
  providerId: NangoProviderId;
  connectionId: string;
  error: string;
}) {
  const current = await getPersistedNangoConnection(input.userId, input.providerId);
  if (!current || current.config.connection_id !== input.connectionId) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("integrations")
    .update({ status: "error", last_error: input.error.slice(0, 300) })
    .eq("id", current.id)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function createNangoConnectSession(
  user: { id: string; email?: string | null },
  providerId: NangoProviderId,
) {
  const integrationId = configuredIntegrationId(providerId);
  if (!integrationId)
    throw new Error(
      `${findNangoProvider(providerId)?.name ?? providerId} is not configured in Nango.`,
    );
  const tags: Record<string, string> = { end_user_id: user.id, palladium_provider: providerId };
  if (user.email) tags["end_user_email"] = user.email;
  const stored = await getPersistedNangoConnection(user.id, providerId);
  const storedId = stored?.config.connection_id;
  const result = await nangoFetch(storedId ? "/connect/sessions/reconnect" : "/connect/sessions", {
    method: "POST",
    body: JSON.stringify(
      storedId
        ? {
            connection_id: storedId,
            integration_id: stored.config.integration_id || integrationId,
            tags,
          }
        : { tags, allowed_integrations: [integrationId] },
    ),
  });
  if (!result?.data?.token) throw new Error("Nango did not return a Connect session token.");
  return { sessionToken: result.data.token as string, reconnecting: Boolean(storedId) };
}

export async function listOwnedNangoConnections(userId: string) {
  const result = await nangoFetch(
    `/connections?${new URLSearchParams({ "tags[end_user_id]": userId })}`,
  );
  const rows = Array.isArray(result?.connections)
    ? result.connections
    : Array.isArray(result?.data)
      ? result.data
      : [];
  return rows.filter(
    (row: any) => row?.tags?.end_user_id === userId || row?.end_user?.id === userId,
  );
}

export async function getOwnedNangoConnection(userId: string, providerId: NangoProviderId) {
  const stored = await getPersistedNangoConnection(userId, providerId);
  if (stored?.config.connection_id) return { ...stored.config, persisted: stored };
  const integrationId = configuredIntegrationId(providerId);
  if (!integrationId) return null;
  const connection =
    (await listOwnedNangoConnections(userId)).find(
      (row: any) =>
        (row.integration_id || row.provider_config_key || row.providerConfigKey) === integrationId,
    ) ?? null;
  const id = connectionId(connection);
  if (connection && id)
    await persistNangoConnection({
      userId,
      providerId,
      connectionId: id,
      integrationId,
      provider: connection.provider,
      environment: connection.environment,
      authMode: connection.auth_mode || connection.authMode,
      tags: connection.tags,
    });
  return connection;
}

export async function disconnectOwnedNangoConnection(userId: string, providerId: NangoProviderId) {
  const stored = await getPersistedNangoConnection(userId, providerId);
  const id = stored?.config.connection_id;
  if (!stored || !id)
    throw new Error(
      `No Nango ${findNangoProvider(providerId)?.name ?? providerId} connection exists for this PalladiumAI user.`,
    );
  const integrationId = stored.config.integration_id || configuredIntegrationId(providerId)!;
  try {
    await nangoFetch(
      `/connections/${encodeURIComponent(id)}?${new URLSearchParams({ provider_config_key: integrationId })}`,
      { method: "DELETE" },
    );
  } catch (error) {
    if (!(error instanceof NangoHttpError) || error.status !== 404) throw error;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("id", stored.id)
    .eq("user_id", userId)
    .eq("provider", nangoStorageProvider(providerId));
  if (error) throw new Error(error.message);
  return { ok: true };
}

function proxyPath(url: string) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}
export async function proxyOwnedNangoRequest(
  userId: string,
  providerId: NangoProviderId,
  spec: SafeNangoRequest,
  signal?: AbortSignal,
) {
  const connection = await getOwnedNangoConnection(userId, providerId);
  const id = connectionId(connection);
  const integrationId =
    connection?.integration_id ||
    connection?.provider_config_key ||
    connection?.providerConfigKey ||
    configuredIntegrationId(providerId);
  if (!id || !integrationId)
    throw new Error(
      `${findNangoProvider(providerId)?.name ?? providerId} is not connected through Nango.`,
    );
  return nangoFetch(`/proxy${proxyPath(spec.url)}`, {
    method: spec.method ?? "GET",
    headers: { "Connection-Id": id, "Provider-Config-Key": integrationId, ...spec.headers },
    ...(spec.body ? { body: spec.body } : {}),
    ...(signal ? { signal } : {}),
  });
}

function nestedValue(value: any, path: string) {
  return path.split(".").reduce((row, key) => row?.[key], value);
}
export async function testOwnedNangoConnection(userId: string, providerId: NangoProviderId) {
  const definition = findNangoProvider(providerId)!;
  const probe = definition.probe;
  const headers = "header" in probe ? { [probe.header[0]]: probe.header[1] } : undefined;
  const result = await proxyOwnedNangoRequest(userId, providerId, {
    url: `https://nango.invalid${probe.path}`,
    method: "method" in probe ? probe.method : "GET",
    ...(headers ? { headers } : {}),
    ...("body" in probe ? { body: probe.body } : {}),
  });
  const label = nestedValue(result, probe.label);
  return { label: typeof label === "string" ? label : null };
}

// Compatibility exports for the original GitHub pilot.
export const getPersistedNangoGitHubConnection = (userId: string) =>
  getPersistedNangoConnection(userId, "github");
export const persistNangoGitHubConnection = (
  input: Omit<Parameters<typeof persistNangoConnection>[0], "providerId">,
) => persistNangoConnection({ ...input, providerId: "github" });
export const markNangoGitHubConnectionError = (
  input: Omit<Parameters<typeof markNangoConnectionError>[0], "providerId">,
) => markNangoConnectionError({ ...input, providerId: "github" });
export const createNangoGitHubConnectSession = (user: { id: string; email?: string | null }) =>
  createNangoConnectSession(user, "github");
export const getOwnedNangoGitHubConnection = (userId: string) =>
  getOwnedNangoConnection(userId, "github");
export const disconnectOwnedNangoGitHubConnection = (userId: string) =>
  disconnectOwnedNangoConnection(userId, "github");
export const testOwnedNangoGitHubConnection = async (userId: string) => ({
  connection: await getOwnedNangoConnection(userId, "github"),
  login: (await testOwnedNangoConnection(userId, "github")).label,
});
