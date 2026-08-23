import {
  findNangoProvider,
  isSafeNangoProviderId,
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

export type NangoActionFunction = {
  name: string;
  description?: string;
  type: "action";
  input?: string;
  returns?: string[];
  json_schema?: Record<string, unknown> | null;
  deployed?: {
    id?: number;
    enabled?: boolean;
    last_deployed?: string;
    source?: string;
  };
};

function normalizeActionFunction(value: unknown): NangoActionFunction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = typeof row["name"] === "string" ? row["name"].trim() : "";
  if (!name || name.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(name)) return null;
  if (row["type"] !== "action") return null;
  return {
    name,
    type: "action",
    ...(typeof row["description"] === "string"
      ? { description: row["description"].slice(0, 1000) }
      : {}),
    ...(typeof row["input"] === "string" ? { input: row["input"] } : {}),
    ...(Array.isArray(row["returns"])
      ? { returns: row["returns"].filter((item): item is string => typeof item === "string") }
      : {}),
    ...(row["json_schema"] && typeof row["json_schema"] === "object"
      ? { json_schema: row["json_schema"] as Record<string, unknown> }
      : {}),
    ...(row["deployed"] && typeof row["deployed"] === "object"
      ? { deployed: row["deployed"] as NonNullable<NangoActionFunction["deployed"]> }
      : {}),
  };
}

export async function listNangoProviderActionTemplates(providerId: NangoProviderId) {
  if (!isSafeNangoProviderId(providerId)) throw new Error("Unsupported Nango provider.");
  const result = await nangoFetch(`/providers/${encodeURIComponent(providerId)}/templates`);
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows
    .map(normalizeActionFunction)
    .filter((row: NangoActionFunction | null): row is NangoActionFunction => Boolean(row));
}

export async function listNangoIntegrationActions(integrationId: string) {
  if (!integrationId || integrationId.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(integrationId))
    throw new Error("Invalid Nango integration ID.");
  const query = new URLSearchParams({ type: "action", limit: "100" });
  const result = await nangoFetch(
    `/integrations/${encodeURIComponent(integrationId)}/functions?${query}`,
  );
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows
    .map(normalizeActionFunction)
    .filter((row: NangoActionFunction | null): row is NangoActionFunction => Boolean(row));
}

export async function deployNangoActionTemplate(integrationId: string, actionName: string) {
  try {
    const result = await nangoFetch("/functions/deployments", {
      method: "POST",
      body: JSON.stringify({
        type: "template",
        integration_id: integrationId,
        template: actionName,
        function_type: "action",
      }),
    });
    if (result?.status === "failed")
      throw new Error(String(result?.error?.message || "Nango action deployment failed."));
    return { deployed: true, deploymentId: result?.id ? String(result.id) : null };
  } catch (error) {
    if (
      error instanceof NangoHttpError &&
      error.status === 409 &&
      (error.body as any)?.error?.code === "template_already_deployed"
    ) {
      return { deployed: false, deploymentId: null };
    }
    throw error;
  }
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
  if (!isSafeNangoProviderId(providerId)) return null;
  const provider = findNangoProvider(providerId);
  if (!provider) return `palladium-${providerId}`;
  return process.env[provider.env]?.trim() || provider.defaultIntegrationId;
}
export function nangoIntegrationId(providerId: NangoProviderId) {
  return configuredIntegrationId(providerId);
}
export function nangoProviderFromIntegrationId(integrationId: string) {
  const curated = NANGO_PROVIDERS.find(
    (provider) => configuredIntegrationId(provider.id) === integrationId,
  );
  if (curated) return curated;
  if (!integrationId.startsWith("palladium-")) return null;
  const id = integrationId.slice("palladium-".length);
  return isSafeNangoProviderId(id)
    ? { id, name: id, category: "other", defaultIntegrationId: integrationId }
    : null;
}
export function nangoConfigured() {
  return Boolean(process.env["NANGO_SECRET_KEY"]?.trim() || process.env["NANGO_API_KEY"]?.trim());
}
export function nangoProviderConfigured(providerId: NangoProviderId) {
  return nangoConfigured() && Boolean(configuredIntegrationId(providerId));
}

type NangoIntegration = {
  unique_key: string;
  display_name?: string;
  provider: string;
};

export type NangoCatalogueProvider = {
  id: string;
  name: string;
  categories: string[];
  category: string;
  authMode: string;
  logoUrl: string | null;
  docsUrl: string | null;
  curated: boolean;
};

function normalizeCatalogueProvider(row: any): NangoCatalogueProvider | null {
  const id = typeof row?.name === "string" ? row.name.trim() : "";
  if (!isSafeNangoProviderId(id)) return null;
  const categories = Array.isArray(row.categories)
    ? row.categories.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const curated = findNangoProvider(id);
  return {
    id,
    name:
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : curated?.name || id,
    categories,
    category: curated?.category || categories[0] || "other",
    authMode: typeof row.auth_mode === "string" ? row.auth_mode : "UNKNOWN",
    logoUrl: typeof row.logo_url === "string" ? row.logo_url : null,
    docsUrl: typeof row.docs === "string" ? row.docs : null,
    curated: Boolean(curated),
  };
}

export async function listNangoProviderCatalogue(): Promise<NangoCatalogueProvider[]> {
  const result = await nangoFetch("/providers");
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows
    .map(normalizeCatalogueProvider)
    .filter((row: NangoCatalogueProvider | null): row is NangoCatalogueProvider => Boolean(row))
    .sort((left: NangoCatalogueProvider, right: NangoCatalogueProvider) =>
      left.curated === right.curated ? left.name.localeCompare(right.name) : left.curated ? -1 : 1,
    );
}

async function getNangoCatalogueProvider(providerId: string) {
  if (!isSafeNangoProviderId(providerId)) throw new Error("Unsupported Nango provider.");
  const result = await nangoFetch(`/providers/${encodeURIComponent(providerId)}`);
  const provider = normalizeCatalogueProvider(result?.data ?? result);
  if (!provider || provider.id !== providerId) throw new Error("Unsupported Nango provider.");
  return provider;
}

export async function listNangoIntegrations(): Promise<NangoIntegration[]> {
  const result = await nangoFetch("/integrations");
  return Array.isArray(result?.data)
    ? result.data.filter((row: unknown): row is NangoIntegration =>
        Boolean(
          row &&
          typeof row === "object" &&
          typeof (row as NangoIntegration).unique_key === "string" &&
          typeof (row as NangoIntegration).provider === "string",
        ),
      )
    : [];
}

export async function ensureNangoIntegration(providerId: NangoProviderId) {
  if (!isSafeNangoProviderId(providerId)) throw new Error("Unsupported Nango provider.");
  const curated = findNangoProvider(providerId);
  const definition = curated ? { name: curated.name } : await getNangoCatalogueProvider(providerId);
  const integrationId = configuredIntegrationId(providerId)!;
  let existing: any = null;
  try {
    const result = await nangoFetch(`/integrations/${encodeURIComponent(integrationId)}`);
    existing = result?.data ?? result;
  } catch (error) {
    if (!(error instanceof NangoHttpError) || error.status !== 404) throw error;
  }

  if (existing) {
    if (existing.provider !== providerId) {
      throw new Error(`Integration ID is already assigned to ${existing.provider}.`);
    }
    return { integrationId, created: false };
  }

  try {
    await nangoFetch("/integrations", {
      method: "POST",
      body: JSON.stringify({
        unique_key: integrationId,
        provider: providerId,
        display_name: `PalladiumAI ${definition.name}`,
        forward_webhooks: true,
      }),
    });
  } catch (error) {
    // A simultaneous Connect request may have created the same fixed record.
    if (!(error instanceof NangoHttpError) || error.status !== 409) throw error;
    const result = await nangoFetch(`/integrations/${encodeURIComponent(integrationId)}`);
    const current = result?.data ?? result;
    if (current?.provider !== providerId) {
      throw new Error(
        `Integration ID is already assigned to ${current?.provider || "another provider"}.`,
      );
    }
  }
  return { integrationId, created: true };
}

export async function provisionNangoIntegrations() {
  const existing = await listNangoIntegrations();
  const byKey = new Map(existing.map((integration) => [integration.unique_key, integration]));

  return Promise.all(
    NANGO_PROVIDERS.map(async (definition) => {
      const integrationId = configuredIntegrationId(definition.id)!;
      const current = byKey.get(integrationId);
      if (current) {
        return current.provider === definition.id
          ? { id: definition.id, integrationId, status: "existing" as const }
          : {
              id: definition.id,
              integrationId,
              status: "error" as const,
              error: `Integration ID is already assigned to ${current.provider}.`,
            };
      }

      try {
        await nangoFetch("/integrations", {
          method: "POST",
          body: JSON.stringify({
            unique_key: integrationId,
            provider: definition.id,
            display_name: `PalladiumAI ${definition.name}`,
            forward_webhooks: true,
          }),
        });
        return { id: definition.id, integrationId, status: "created" as const };
      } catch (error) {
        return {
          id: definition.id,
          integrationId,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Nango integration creation failed.",
        };
      }
    }),
  );
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

export async function listPersistedNangoConnections(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("id,provider,status,account_label,connected_at,last_error,config")
    .eq("user_id", userId)
    .like("provider", "nango_%");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row: any) => {
    const storageProvider = String(row.provider || "");
    if (!storageProvider.startsWith("nango_")) return [];
    const providerId = storageProvider.slice("nango_".length);
    return isSafeNangoProviderId(providerId)
      ? [{ ...row, providerId, config: connectionConfig(row) }]
      : [];
  });
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
  if (!isSafeNangoProviderId(input.providerId)) throw new Error("Unsupported Nango provider.");
  const definition = findNangoProvider(input.providerId);
  const integrationId = input.integrationId || configuredIntegrationId(input.providerId);
  if (!integrationId)
    throw new Error(`${definition?.name || input.providerId} is not configured in Nango.`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const current = await getPersistedNangoConnection(input.userId, input.providerId);
  const { error } = await supabaseAdmin.from("integrations").upsert(
    {
      user_id: input.userId,
      org_id: null,
      provider: nangoStorageProvider(input.providerId),
      name: `${definition?.name || input.providerId} via Nango`,
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
  await ensureNangoIntegration(providerId);
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

export async function triggerOwnedNangoAction(
  userId: string,
  providerId: NangoProviderId,
  actionName: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (!isSafeNangoProviderId(providerId)) throw new Error("Unsupported Nango provider.");
  if (!actionName || actionName.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(actionName))
    throw new Error("Invalid Nango action name.");
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
  return nangoFetch("/action/trigger", {
    method: "POST",
    headers: { "Connection-Id": id, "Provider-Config-Key": integrationId },
    body: JSON.stringify({ action_name: actionName, input }),
    ...(signal ? { signal } : {}),
  });
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
  const definition = findNangoProvider(providerId);
  if (!definition)
    throw new Error(
      "This account is connected. A provider-specific live test is not available yet.",
    );
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
