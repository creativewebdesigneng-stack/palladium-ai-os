import { getIntegrationAccessToken } from "./oauth.server";
import {
  buildConnectedServiceRequest,
  CONNECTED_SERVICE_ACTIONS,
  type ConnectedServiceInput,
} from "./connected-service.server";
import { findProvider } from "./providers";

const MAX_RESPONSE_CHARS = 18_000;

export const DIRECT_CONNECTED_SERVICE_PROVIDERS = [
  "google",
  "microsoft",
  "slack",
  "hubspot",
  "notion",
  "asana",
  "linear",
] as const;

export type DirectConnectedServiceProvider =
  (typeof DIRECT_CONNECTED_SERVICE_PROVIDERS)[number];

export function isDirectConnectedServiceProvider(
  provider: string,
): provider is DirectConnectedServiceProvider {
  return (DIRECT_CONNECTED_SERVICE_PROVIDERS as readonly string[]).includes(provider);
}

export function directConnectedServiceActions(provider: string): readonly string[] {
  return isDirectConnectedServiceProvider(provider)
    ? (CONNECTED_SERVICE_ACTIONS[provider] ?? [])
    : [];
}

export async function hasDirectConnectedService(
  userId: string,
  provider: string,
): Promise<boolean> {
  if (!isDirectConnectedServiceProvider(provider)) return false;
  return Boolean(await getIntegrationAccessToken(userId, provider));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { text: text.slice(0, MAX_RESPONSE_CHARS) };
  }
}

function truncate(value: unknown): unknown {
  const text = JSON.stringify(value ?? null);
  if (text.length <= MAX_RESPONSE_CHARS) return value;
  return { truncated: true, preview: text.slice(0, MAX_RESPONSE_CHARS) };
}

/**
 * Executes only through the provider's native OAuth API. This function never
 * falls back to Nango, browser automation, or another transport. Keeping that
 * behavior here lets the provider-neutral dispatcher make failover decisions
 * explicitly and audit the lane that actually handled the request.
 */
export async function executeDirectConnectedService(
  userId: string,
  input: ConnectedServiceInput,
  signal?: AbortSignal,
): Promise<unknown> {
  const providerId = String(input.provider ?? "").trim().toLowerCase();
  const action = String(input.action ?? "").trim().toLowerCase();
  if (!isDirectConnectedServiceProvider(providerId)) {
    throw new Error(`No native direct API adapter is registered for ${providerId || "that provider"}.`);
  }
  if (!directConnectedServiceActions(providerId).includes(action)) {
    throw new Error(`Action "${action}" is not available through the native ${providerId} adapter.`);
  }

  const provider = findProvider(providerId);
  if (!provider) throw new Error("Unknown integration provider.");
  const accessToken = await getIntegrationAccessToken(userId, providerId);
  if (!accessToken) {
    throw new Error(`${provider.name} is not connected through its native OAuth integration.`);
  }

  const spec = buildConnectedServiceRequest({ ...input, provider: providerId, action });
  try {
    const response = await fetch(spec.url, {
      method: spec.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...spec.headers,
      },
      ...(spec.body ? { body: spec.body } : {}),
      signal: signal ?? AbortSignal.timeout(20_000),
    });
    const text = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
    const payload = safeJson(text);
    if (!response.ok) {
      const error = new Error(`${provider.name} returned ${response.status}.`);
      Object.assign(error, { status: response.status, details: truncate(payload) });
      throw error;
    }
    return {
      provider: providerId,
      action,
      read_only: true,
      transport: "direct_api",
      data: truncate(payload),
    };
  } catch (error) {
    if ((error as Error).name === "AbortError" || (error as Error).name === "TimeoutError") {
      throw new Error(`${provider.name} request timed out.`);
    }
    throw error;
  }
}
