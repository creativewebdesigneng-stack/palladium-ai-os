import { getIntegrationAccessToken } from "./oauth.server";
import { metaGraphUrl } from "./meta-social.server";

const MAX_RESPONSE_CHARS = 18_000;
const INSTAGRAM_DAILY_PUBLISH_LIMIT = 100;

type InstagramPageAsset = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramId: string;
  username: string | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanHttpsUrl(value: unknown, label: string): string {
  const raw = text(value, 2000);
  if (!raw) throw new Error(`${label} is required.`);
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error(`${label} must be a clean HTTPS URL.`);
  }
  return url.toString();
}

async function readPayload(response: Response, context: string): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Meta returned an unreadable ${context} response (${response.status}).`);
  }
  if (!response.ok || payload["error"]) {
    const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
      ? payload["error"] as Record<string, unknown>
      : {};
    throw new Error(text(error["message"], 300) || `Meta returned ${response.status} during ${context}.`);
  }
  return payload;
}

async function discoverInstagramAssetsWithTokens(
  userId: string,
  signal?: AbortSignal,
): Promise<InstagramPageAsset[]> {
  const accessToken = await getIntegrationAccessToken(userId, "meta");
  if (!accessToken) throw new Error("Meta is not connected or its access has expired.");

  const url = metaGraphUrl("me/accounts");
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readPayload(response, "Instagram account discovery");
  const rows = Array.isArray(payload["data"]) ? payload["data"] : [];
  return rows.flatMap((value): InstagramPageAsset[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const ig = row["instagram_business_account"] && typeof row["instagram_business_account"] === "object" && !Array.isArray(row["instagram_business_account"])
      ? row["instagram_business_account"] as Record<string, unknown>
      : {};
    const pageId = text(row["id"], 160);
    const pageName = text(row["name"], 200);
    const pageAccessToken = text(row["access_token"], 4096);
    const instagramId = text(ig["id"], 160);
    if (!pageId || !pageName || !pageAccessToken || !instagramId) return [];
    return [{
      pageId,
      pageName,
      pageAccessToken,
      instagramId,
      username: text(ig["username"], 160) || null,
    }];
  });
}

export async function discoverNativeInstagramAccounts(
  userId: string,
  signal?: AbortSignal,
): Promise<Array<{ pageId: string; pageName: string; instagramId: string; username: string | null }>> {
  const rows = await discoverInstagramAssetsWithTokens(userId, signal);
  return rows.map(({ pageAccessToken: _secret, ...safe }) => safe);
}

async function findOwnedInstagramAsset(
  userId: string,
  instagramId: string,
  signal?: AbortSignal,
): Promise<InstagramPageAsset> {
  const id = text(instagramId, 160);
  if (!/^[A-Za-z0-9_-]{2,160}$/.test(id)) throw new Error("A valid Instagram professional account ID is required.");
  const assets = await discoverInstagramAssetsWithTokens(userId, signal);
  const asset = assets.find((item) => item.instagramId === id);
  if (!asset) throw new Error("The selected Instagram professional account is not available to this Meta connection.");
  return asset;
}

export async function getInstagramPublishingUsage(input: {
  userId: string;
  instagramId: string;
  signal?: AbortSignal;
}): Promise<{ quotaUsage: number | null; limit: number }> {
  const asset = await findOwnedInstagramAsset(input.userId, input.instagramId, input.signal);
  const url = metaGraphUrl(`${asset.instagramId}/content_publishing_limit`);
  url.searchParams.set("fields", "quota_usage");
  url.searchParams.set("access_token", asset.pageAccessToken);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: input.signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readPayload(response, "Instagram publishing-limit");
  const data = Array.isArray(payload["data"]) ? payload["data"] : [];
  const first = data[0] && typeof data[0] === "object" && !Array.isArray(data[0])
    ? data[0] as Record<string, unknown>
    : {};
  const parsed = Number(first["quota_usage"]);
  return {
    quotaUsage: Number.isInteger(parsed) && parsed >= 0 ? parsed : null,
    limit: INSTAGRAM_DAILY_PUBLISH_LIMIT,
  };
}

export async function publishInstagramImagePost(input: {
  userId: string;
  instagramId: string;
  imageUrl: string;
  caption: string;
  altText?: string;
  signal?: AbortSignal;
}): Promise<{ mediaId: string; containerId: string }> {
  const imageUrl = cleanHttpsUrl(input.imageUrl, "Instagram image URL");
  const caption = text(input.caption, 2200);
  if (!caption) throw new Error("Instagram caption is required.");
  const altText = text(input.altText, 1000);
  const asset = await findOwnedInstagramAsset(input.userId, input.instagramId, input.signal);

  const usage = await getInstagramPublishingUsage({
    userId: input.userId,
    instagramId: asset.instagramId,
    ...(input.signal ? { signal: input.signal } : {}),
  });
  if (usage.quotaUsage !== null && usage.quotaUsage >= usage.limit) {
    throw new Error("Instagram's 24-hour API publishing limit has been reached for this account.");
  }

  const createBody = new URLSearchParams({ image_url: imageUrl, caption });
  if (altText) createBody.set("alt_text", altText);
  createBody.set("access_token", asset.pageAccessToken);
  const createResponse = await fetch(metaGraphUrl(`${asset.instagramId}/media`), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
    signal: input.signal ?? AbortSignal.timeout(25_000),
  });
  const createPayload = await readPayload(createResponse, "Instagram media-container creation");
  const containerId = text(createPayload["id"], 240);
  if (!containerId) throw new Error("Meta did not return an Instagram media container ID.");

  const publishBody = new URLSearchParams({
    creation_id: containerId,
    access_token: asset.pageAccessToken,
  });
  const publishResponse = await fetch(metaGraphUrl(`${asset.instagramId}/media_publish`), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
    signal: input.signal ?? AbortSignal.timeout(25_000),
  });
  const publishPayload = await readPayload(publishResponse, "Instagram media publish");
  const mediaId = text(publishPayload["id"], 240);
  if (!mediaId) throw new Error("Meta accepted the Instagram publish request but did not return a media ID.");
  return { mediaId, containerId };
}
