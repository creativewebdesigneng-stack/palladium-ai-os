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
  const raw = (await response.text()).slice(0, MAX_RESPONSE_CHARS * 2);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`TikTok returned an unreadable creator-info response (${response.status}).`);
  }

  const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
    ? payload["error"] as Record<string, unknown>
    : {};
  const errorCode = text(error["code"], 120);
  if (!response.ok || (errorCode && errorCode !== "ok")) {
    const message = text(error["message"], 300) || `TikTok returned ${response.status}.`;
    throw new Error(message);
  }

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
