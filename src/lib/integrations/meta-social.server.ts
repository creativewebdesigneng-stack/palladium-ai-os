import { getIntegrationAccessToken } from "./oauth.server";

const GRAPH_HOST = "https://graph.facebook.com";
const META_VERSION = /^v\d{1,3}\.\d{1,2}$/;
const MAX_RESPONSE_CHARS = 18_000;

export type MetaInstagramAccount = {
  id: string;
  username: string | null;
  name: string | null;
  profilePictureUrl: string | null;
};

export type MetaPageAsset = {
  id: string;
  name: string;
  tasks: string[];
  instagramAccount: MetaInstagramAccount | null;
};

type MetaPageWithToken = MetaPageAsset & { pageAccessToken: string };

type MetaApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function configuredGraphVersion(): string {
  const raw = text(process.env["META_GRAPH_API_VERSION"], 16);
  if (!META_VERSION.test(raw)) {
    throw new Error("META_GRAPH_API_VERSION must be configured as a version such as v23.0.");
  }
  return raw;
}

export function metaGraphUrl(path: string, version = configuredGraphVersion()): URL {
  if (!META_VERSION.test(version)) throw new Error("Invalid Meta Graph API version.");
  const cleanPath = path.replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("..")) throw new Error("Invalid Meta Graph API path.");
  return new URL(`${GRAPH_HOST}/${version}/${cleanPath}`);
}

function parseInstagram(value: unknown): MetaInstagramAccount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row["id"], 160);
  if (!id) return null;
  return {
    id,
    username: text(row["username"], 160) || null,
    name: text(row["name"], 200) || null,
    profilePictureUrl: text(row["profile_picture_url"], 1000) || null,
  };
}

function parsePages(payload: unknown): MetaPageWithToken[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const data = (payload as Record<string, unknown>)["data"];
  if (!Array.isArray(data)) return [];
  return data.flatMap((value): MetaPageWithToken[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const id = text(row["id"], 160);
    const name = text(row["name"], 200);
    const pageAccessToken = text(row["access_token"], 4096);
    if (!id || !name || !pageAccessToken) return [];
    return [{
      id,
      name,
      pageAccessToken,
      tasks: Array.isArray(row["tasks"])
        ? row["tasks"].filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 80)).slice(0, 30)
        : [],
      instagramAccount: parseInstagram(row["instagram_business_account"]),
    }];
  });
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    if (!response.ok) throw new Error(`Meta returned an unreadable response (${response.status}).`);
    return { text: raw.slice(0, MAX_RESPONSE_CHARS) };
  }
}

function metaError(payload: Record<string, unknown>, status: number): Error {
  const error = (payload as MetaApiError).error;
  const message = text(error?.message, 300) || `Meta returned ${status}.`;
  return new Error(message);
}

async function metaRequest(
  path: string,
  accessToken: string,
  init: { method?: "GET" | "POST"; body?: URLSearchParams; signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
  const url = metaGraphUrl(path);
  const method = init.method ?? "GET";
  if (method === "GET") url.searchParams.set("access_token", accessToken);
  const body = init.body;
  if (method === "POST" && body) body.set("access_token", accessToken);
  const response = await fetch(url, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    ...(body ? { body } : {}),
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readPayload(response);
  if (!response.ok || payload["error"]) throw metaError(payload, response.status);
  return payload;
}

export async function exchangeForLongLivedMetaToken(
  shortLivedToken: string,
  signal?: AbortSignal,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const clientId = text(process.env["META_INTEGRATION_CLIENT_ID"], 300);
  const clientSecret = text(process.env["META_INTEGRATION_CLIENT_SECRET"], 1000);
  if (!clientId || !clientSecret) throw new Error("Meta OAuth credentials are not configured.");
  const url = metaGraphUrl("oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: signal ?? AbortSignal.timeout(20_000) });
  const payload = await readPayload(response);
  if (!response.ok || payload["error"]) throw metaError(payload, response.status);
  const accessToken = text(payload["access_token"], 4096);
  if (!accessToken) throw new Error("Meta did not return a long-lived access token.");
  const expiresIn = Number(payload["expires_in"] ?? 0);
  return {
    accessToken,
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null,
  };
}

async function discoverPagesWithTokens(accessToken: string, signal?: AbortSignal): Promise<MetaPageWithToken[]> {
  const url = metaGraphUrl("me/accounts");
  url.searchParams.set("fields", "id,name,access_token,tasks,instagram_business_account{id,username,name,profile_picture_url}");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: signal ?? AbortSignal.timeout(20_000) });
  const payload = await readPayload(response);
  if (!response.ok || payload["error"]) throw metaError(payload, response.status);
  return parsePages(payload);
}

/** Safe account discovery for UI/config use. Page access tokens are deliberately stripped. */
export async function discoverMetaAssets(userId: string, signal?: AbortSignal): Promise<MetaPageAsset[]> {
  const accessToken = await getIntegrationAccessToken(userId, "meta");
  if (!accessToken) throw new Error("Meta is not connected or its access has expired.");
  return (await discoverPagesWithTokens(accessToken, signal)).map(({ pageAccessToken: _secret, ...asset }) => asset);
}

export async function publishFacebookPagePost(input: {
  userId: string;
  pageId: string;
  message: string;
  link?: string;
  signal?: AbortSignal;
}): Promise<{ id: string }> {
  const pageId = text(input.pageId, 160);
  const message = text(input.message, 63_000);
  if (!/^[A-Za-z0-9_-]{2,160}$/.test(pageId)) throw new Error("A valid Facebook Page ID is required.");
  if (!message) throw new Error("Facebook post content is required.");
  const accessToken = await getIntegrationAccessToken(input.userId, "meta");
  if (!accessToken) throw new Error("Meta is not connected or its access has expired.");
  const pages = await discoverPagesWithTokens(accessToken, input.signal);
  const page = pages.find((item) => item.id === pageId);
  if (!page) throw new Error("The selected Facebook Page is not available to this Meta connection.");
  const body = new URLSearchParams({ message });
  if (input.link) {
    const link = new URL(input.link);
    if (link.protocol !== "https:") throw new Error("Facebook post links must use HTTPS.");
    body.set("link", link.toString().slice(0, 2000));
  }
  const payload = await metaRequest(`${page.id}/feed`, page.pageAccessToken, {
    method: "POST",
    body,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  const id = text(payload["id"], 240);
  if (!id) throw new Error("Meta accepted the request but did not return a post ID.");
  return { id };
}
