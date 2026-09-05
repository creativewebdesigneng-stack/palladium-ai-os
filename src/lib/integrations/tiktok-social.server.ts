import { getIntegrationAccessToken } from "./oauth.server";

const TIKTOK_API = "https://open.tiktokapis.com";
const MAX_RESPONSE_CHARS = 18_000;
const PRIVACY_LEVELS = new Set([
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
]);

export type TikTokCreatorInfo = {
  username: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 86_400 ? parsed : null;
}

function configuredMediaPrefixes(): URL[] {
  const raw = process.env["TIKTOK_VERIFIED_MEDIA_URL_PREFIXES"] ?? "";
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item): URL[] => {
      try {
        const url = new URL(item);
        if (url.protocol !== "https:" || url.username || url.password) return [];
        return [url];
      } catch {
        return [];
      }
    })
    .slice(0, 20);
}

export function verifiedTikTokMediaUrl(value: unknown): string {
  const raw = text(value, 2000);
  if (!raw) throw new Error("TikTok media URL is required.");
  const candidate = new URL(raw);
  if (candidate.protocol !== "https:" || candidate.username || candidate.password || candidate.hash) {
    throw new Error("TikTok media URL must be a clean HTTPS URL.");
  }
  const prefixes = configuredMediaPrefixes();
  if (!prefixes.length) {
    throw new Error("TikTok verified media URL prefixes are not configured for this workspace.");
  }
  const owned = prefixes.some((prefix) =>
    candidate.origin === prefix.origin && candidate.pathname.startsWith(prefix.pathname),
  );
  if (!owned) {
    throw new Error("TikTok media URL must be under a URL prefix verified for this TikTok developer app.");
  }
  return candidate.toString();
}

async function readTikTokPayload(response: Response, context: string): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`TikTok returned an unreadable ${context} response (${response.status}).`);
  }
  const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
    ? payload["error"] as Record<string, unknown>
    : {};
  const errorCode = text(error["code"], 120);
  if (!response.ok || (errorCode && errorCode !== "ok")) {
    const message = text(error["message"], 300) || `TikTok returned ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

export async function queryTikTokCreatorInfo(
  userId: string,
  signal?: AbortSignal,
): Promise<TikTokCreatorInfo> {
  const token = await getIntegrationAccessToken(userId, "tiktok");
  if (!token) throw new Error("TikTok is not connected or its access has expired.");

  const response = await fetch(`${TIKTOK_API}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
    },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readTikTokPayload(response, "creator-info");

  const data = payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
    ? payload["data"] as Record<string, unknown>
    : {};
  const privacyLevelOptions = Array.isArray(data["privacy_level_options"])
    ? data["privacy_level_options"]
        .filter((item): item is string => typeof item === "string" && PRIVACY_LEVELS.has(item))
        .slice(0, 8)
    : [];

  return {
    username: text(data["creator_username"], 160) || null,
    nickname: text(data["creator_nickname"], 160) || null,
    avatarUrl: text(data["creator_avatar_url"], 1000) || null,
    privacyLevelOptions,
    commentDisabled: bool(data["comment_disabled"]),
    duetDisabled: bool(data["duet_disabled"]),
    stitchDisabled: bool(data["stitch_disabled"]),
    maxVideoPostDurationSec: positiveInt(data["max_video_post_duration_sec"]),
  };
}

export async function publishTikTokPhotoPost(input: {
  userId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  privacyLevel: string;
  allowComment: boolean;
  autoAddMusic: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  signal?: AbortSignal;
}): Promise<{ publishId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "tiktok");
  if (!token) throw new Error("TikTok is not connected or its access has expired.");
  const imageUrl = verifiedTikTokMediaUrl(input.imageUrl);
  const privacyLevel = text(input.privacyLevel, 80);
  if (!PRIVACY_LEVELS.has(privacyLevel)) throw new Error("A valid TikTok privacy level is required.");

  // TikTok requires the latest creator-info response to drive privacy and
  // interaction controls. Re-check immediately before dispatch so an approval
  // cannot execute against stale account permissions.
  const creator = await queryTikTokCreatorInfo(input.userId, input.signal);
  if (!creator.privacyLevelOptions.includes(privacyLevel)) {
    throw new Error("The selected TikTok privacy level is no longer available for this creator.");
  }
  if (input.allowComment && creator.commentDisabled) {
    throw new Error("TikTok comments are disabled for this creator and cannot be enabled for this post.");
  }
  if (input.brandContent && privacyLevel === "SELF_ONLY") {
    throw new Error("TikTok branded content cannot use private (Only me) visibility.");
  }

  const title = text(input.title, 90);
  const description = text(input.description, 4000);
  const response = await fetch(`${TIKTOK_API}/v2/post/publish/content/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        privacy_level: privacyLevel,
        disable_comment: creator.commentDisabled || !input.allowComment,
        auto_add_music: input.autoAddMusic,
        brand_content_toggle: input.brandContent,
        brand_organic_toggle: input.brandOrganic,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [imageUrl],
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
    signal: input.signal ?? AbortSignal.timeout(20_000),
  });
  const payload = await readTikTokPayload(response, "Direct Post");
  const data = payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
    ? payload["data"] as Record<string, unknown>
    : {};
  const publishId = text(data["publish_id"], 100);
  if (!publishId) throw new Error("TikTok accepted the request but did not return a publish ID.");
  return { publishId };
}
