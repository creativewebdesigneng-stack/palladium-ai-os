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

export class NangoHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
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
    signal: init.signal ?? AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Nango returned ${response.status}.`;
    throw new NangoHttpError(String(message).slice(0, 300), response.status);
  }
  return body;
}

function connectionId(connection: any): string | null {
  const value = connection?.connection_id || connection?.id;
  return value ? String(value) : null;
}

function connectionConfig(row: any): NangoConnectionConfig {
  return row?.config && typeof row.config === "object" && !Array.isArray(row.config)
    ? (row.config as NangoConnectionConfig)
    : {};
}

export function nangoConfigured() {
  return Boolean(process.env["NANGO_SECRET_KEY"]?.trim() || process.env["NANGO_API_KEY"]?.trim());
}

export async function getPersistedNangoGitHubConnection(
  userId: string,
): Promise<StoredNangoConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("id,status,account_label,connected_at,last_error,config")
    .eq("user_id", userId)
    .eq("provider", NANGO_GITHUB_PROVIDER)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, config: connectionConfig(data) } as StoredNangoConnection;
}

export async function persistNangoGitHubConnection(input: {
  userId: string;
  connectionId: string;
  integrationId?: string;
  provider?: string;
  environment?: string;
  authMode?: string;
  tags?: Record<string, string>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const current = await getPersistedNangoGitHubConnection(input.userId);
  const { error } = await supabaseAdmin.from("integrations").upsert(
    {
      user_id: input.userId,
      org_id: null,
      provider: NANGO_GITHUB_PROVIDER,
      name: "GitHub via Nango",
      integration_type: "nango",
      status: "connected",
      account_label: input.tags?.["end_user_email"] ?? current?.account_label ?? null,
      connected_at: current?.connected_at ?? now,
      last_error: null,
      config: {
        connection_id: input.connectionId,
        integration_id: input.integrationId || NANGO_GITHUB_INTEGRATION,
        provider: input.provider || "github",
        environment: input.environment,
        auth_mode: input.authMode,
        tags: input.tags ?? { end_user_id: input.userId },
      },
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

export async function markNangoGitHubConnectionError(input: {
  userId: string;
  connectionId: string;
  error: string;
}) {
  const current = await getPersistedNangoGitHubConnection(input.userId);
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

export async function createNangoGitHubConnectSession(user: { id: string; email?: string | null }) {
  const tags: Record<string, string> = { end_user_id: user.id, palladium_provider: "github" };
  if (user.email) tags["end_user_email"] = user.email;
  const stored = await getPersistedNangoGitHubConnection(user.id);
  const storedConnectionId = stored?.config.connection_id;
  const result = await nangoFetch(
    storedConnectionId ? "/connect/sessions/reconnect" : "/connect/sessions",
    {
      method: "POST",
      body: JSON.stringify(
        storedConnectionId
          ? {
              connection_id: storedConnectionId,
              integration_id: stored.config.integration_id || NANGO_GITHUB_INTEGRATION,
              tags,
            }
          : { tags, allowed_integrations: [NANGO_GITHUB_INTEGRATION] },
      ),
    },
  );
  if (!result?.data?.token) throw new Error("Nango did not return a Connect session token.");
  return { sessionToken: result.data.token as string, reconnecting: Boolean(storedConnectionId) };
}

export async function listOwnedNangoConnections(userId: string) {
  const query = new URLSearchParams({ "tags[end_user_id]": userId });
  const result = await nangoFetch(`/connections?${query.toString()}`);
  const rows = Array.isArray(result?.connections)
    ? result.connections
    : Array.isArray(result?.data)
      ? result.data
      : [];
  return rows.filter(
    (row: any) => row?.tags?.end_user_id === userId || row?.end_user?.id === userId,
  );
}

export async function getOwnedNangoGitHubConnection(userId: string) {
  const stored = await getPersistedNangoGitHubConnection(userId);
  if (stored?.config.connection_id) return { ...stored.config, persisted: stored };

  const rows = await listOwnedNangoConnections(userId);
  const connection =
    rows.find((row: any) => {
      const integrationId = row.integration_id || row.provider_config_key || row.providerConfigKey;
      return integrationId === NANGO_GITHUB_INTEGRATION;
    }) ?? null;
  const id = connectionId(connection);
  if (connection && id) {
    await persistNangoGitHubConnection({
      userId,
      connectionId: id,
      integrationId:
        connection.integration_id || connection.provider_config_key || connection.providerConfigKey,
      provider: connection.provider,
      environment: connection.environment,
      authMode: connection.auth_mode || connection.authMode,
      tags: connection.tags,
    });
  }
  return connection;
}

export async function disconnectOwnedNangoGitHubConnection(userId: string) {
  const stored = await getPersistedNangoGitHubConnection(userId);
  const id = stored?.config.connection_id;
  if (!stored || !id)
    throw new Error("No Nango GitHub connection exists for this PalladiumAI user.");
  const integrationId = stored.config.integration_id || NANGO_GITHUB_INTEGRATION;
  const query = new URLSearchParams({ provider_config_key: integrationId });
  try {
    await nangoFetch(`/connections/${encodeURIComponent(id)}?${query.toString()}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (!(error instanceof NangoHttpError) || error.status !== 404) throw error;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("id", stored.id)
    .eq("user_id", userId)
    .eq("provider", NANGO_GITHUB_PROVIDER);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function testOwnedNangoGitHubConnection(userId: string) {
  const connection = await getOwnedNangoGitHubConnection(userId);
  if (!connection) throw new Error("No Nango GitHub connection exists for this PalladiumAI user.");
  const id = connectionId(connection);
  if (!id) throw new Error("Nango connection is missing its connection ID.");
  const result = await nangoFetch("/proxy/user", {
    method: "GET",
    headers: {
      "Connection-Id": id,
      "Provider-Config-Key": NANGO_GITHUB_INTEGRATION,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return { connection, login: result?.login ? String(result.login) : null };
}
