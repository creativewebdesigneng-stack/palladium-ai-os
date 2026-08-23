const NANGO_API = "https://api.nango.dev";

export const NANGO_GITHUB_INTEGRATION = process.env.NANGO_GITHUB_INTEGRATION_ID?.trim() || "github-getting-started";

function secretKey() {
  const key = process.env.NANGO_SECRET_KEY?.trim() || process.env.NANGO_API_KEY?.trim();
  if (!key) throw new Error("Nango is not configured. Add NANGO_SECRET_KEY to the server environment.");
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
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Nango returned ${response.status}.`;
    throw new Error(String(message).slice(0, 300));
  }
  return body;
}

export function nangoConfigured() {
  return Boolean(process.env.NANGO_SECRET_KEY?.trim() || process.env.NANGO_API_KEY?.trim());
}

export async function createNangoGitHubConnectSession(user: { id: string; email?: string | null }) {
  const tags: Record<string, string> = { end_user_id: user.id, palladium_provider: "github" };
  if (user.email) tags.end_user_email = user.email;
  const result = await nangoFetch("/connect/sessions", {
    method: "POST",
    body: JSON.stringify({ tags, allowed_integrations: [NANGO_GITHUB_INTEGRATION] }),
  });
  if (!result?.data?.connect_link) throw new Error("Nango did not return a connect link.");
  return { connectLink: result.data.connect_link as string, expiresAt: result.data.expires_at as string };
}

export async function listOwnedNangoConnections(userId: string) {
  const query = new URLSearchParams({ tag: `end_user_id:${userId}` });
  const result = await nangoFetch(`/connections?${query.toString()}`);
  const rows = Array.isArray(result?.connections) ? result.connections : Array.isArray(result?.data) ? result.data : [];
  return rows.filter((row: any) => row?.tags?.end_user_id === userId || row?.end_user?.id === userId);
}

export async function getOwnedNangoGitHubConnection(userId: string) {
  const rows = await listOwnedNangoConnections(userId);
  return rows.find((row: any) => {
    const integrationId = row.integration_id || row.provider_config_key || row.providerConfigKey;
    return integrationId === NANGO_GITHUB_INTEGRATION;
  }) ?? null;
}

export async function testOwnedNangoGitHubConnection(userId: string) {
  const connection = await getOwnedNangoGitHubConnection(userId);
  if (!connection) throw new Error("No Nango GitHub connection exists for this PalladiumAI user.");
  const connectionId = connection.connection_id || connection.id;
  if (!connectionId) throw new Error("Nango connection is missing its connection ID.");
  const result = await nangoFetch("/proxy/user", {
    method: "GET",
    headers: {
      "Connection-Id": String(connectionId),
      "Provider-Config-Key": NANGO_GITHUB_INTEGRATION,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return { connection, login: result?.login ? String(result.login) : null };
}
