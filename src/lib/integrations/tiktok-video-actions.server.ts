import { getIntegrationAccessToken } from "./oauth.server";
import { queryTikTokCreatorInfo } from "./tiktok-social.server";
import { getTrustedVideoAsset, readTrustedVideoRange } from "@/lib/media/trusted-media.server";

export const TIKTOK_VIDEO_ACTION = "tiktok_video_post" as const;
const TIKTOK_API = "https://open.tiktokapis.com";
const MIN_CHUNK = 5 * 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

export const TIKTOK_VIDEO_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["asset_id", "privacy_level", "allow_comment", "allow_duet", "allow_stitch", "brand_content", "brand_organic", "is_aigc", "music_usage_confirmed"],
  properties: {
    asset_id: { type: "string", format: "uuid" },
    privacy_level: { type: "string", enum: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"] },
    allow_comment: { type: "boolean" },
    allow_duet: { type: "boolean" },
    allow_stitch: { type: "boolean" },
    brand_content: { type: "boolean" },
    brand_organic: { type: "boolean" },
    is_aigc: { type: "boolean" },
    music_usage_confirmed: { type: "boolean", const: true },
    title: { type: "string", maxLength: 2200 },
  },
  additionalProperties: false,
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be explicitly selected.`);
  return value;
}
function validPublishId(value: unknown): string {
  const id = text(value, 100);
  if (!/^[A-Za-z0-9._~-]{6,100}$/.test(id)) throw new Error("TikTok did not return a valid publish ID.");
  return id;
}
function chunkPlan(size: number): { chunkSize: number; totalChunks: number } {
  if (size < MIN_CHUNK) return { chunkSize: size, totalChunks: 1 };
  if (size <= MAX_CHUNK) return { chunkSize: size, totalChunks: 1 };
  const chunkSize = MAX_CHUNK;
  return { chunkSize, totalChunks: Math.floor(size / chunkSize) };
}

export async function prepareTikTokVideoAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  if (input.provider !== "tiktok" || input.action !== TIKTOK_VIDEO_ACTION) throw new Error(`Native TikTok does not expose ${input.provider}:${input.action}.`);
  const token = await getIntegrationAccessToken(input.userId, "tiktok");
  if (!token) throw new Error("TikTok is not connected through its native OAuth integration.");
  const asset = await getTrustedVideoAsset(input.userId, input.actionInput["asset_id"]);
  const creator = await queryTikTokCreatorInfo(input.userId);
  if (creator.maxVideoPostDurationSec && asset.durationSeconds > creator.maxVideoPostDurationSec) {
    throw new Error(`This verified video is ${asset.durationSeconds.toFixed(1)}s, above this creator's current ${creator.maxVideoPostDurationSec}s TikTok limit.`);
  }
  const privacyLevel = text(input.actionInput["privacy_level"], 80);
  if (!creator.privacyLevelOptions.includes(privacyLevel)) throw new Error("The selected TikTok privacy level is not currently available for this creator.");
  const allowComment = requiredBoolean(input.actionInput["allow_comment"], "TikTok comment preference");
  const allowDuet = requiredBoolean(input.actionInput["allow_duet"], "TikTok duet preference");
  const allowStitch = requiredBoolean(input.actionInput["allow_stitch"], "TikTok stitch preference");
  if (allowComment && creator.commentDisabled) throw new Error("TikTok comments are disabled for this creator.");
  if (allowDuet && creator.duetDisabled) throw new Error("TikTok duet is disabled for this creator.");
  if (allowStitch && creator.stitchDisabled) throw new Error("TikTok stitch is disabled for this creator.");
  const brandContent = requiredBoolean(input.actionInput["brand_content"], "TikTok branded-content disclosure");
  const brandOrganic = requiredBoolean(input.actionInput["brand_organic"], "TikTok own-brand disclosure");
  const isAigc = requiredBoolean(input.actionInput["is_aigc"], "TikTok AI-content disclosure");
  if (brandContent && privacyLevel === "SELF_ONLY") throw new Error("TikTok branded content cannot use private (Only me) visibility.");
  if (input.actionInput["music_usage_confirmed"] !== true) throw new Error("TikTok Music Usage Confirmation must be accepted before publishing.");
  return {
    provider: "tiktok",
    action: TIKTOK_VIDEO_ACTION,
    description: "Publish an approved trusted MP4 video to TikTok through Direct Post with current creator controls.",
    risk: "medium" as const,
    requiresApproval: true,
    input: {
      asset_id: asset.id,
      privacy_level: privacyLevel,
      allow_comment: allowComment,
      allow_duet: allowDuet,
      allow_stitch: allowStitch,
      brand_content: brandContent,
      brand_organic: brandOrganic,
      is_aigc: isAigc,
      music_usage_confirmed: true as const,
      title: text(input.actionInput["title"], 2200),
    },
  };
}

export async function publishTikTokTrustedVideo(input: {
  userId: string;
  assetId: string;
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  isAigc: boolean;
  title?: string;
  signal?: AbortSignal;
}): Promise<{ publishId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "tiktok");
  if (!token) throw new Error("TikTok is not connected or its access has expired.");
  const asset = await getTrustedVideoAsset(input.userId, input.assetId);
  const creator = await queryTikTokCreatorInfo(input.userId, input.signal);
  if (creator.maxVideoPostDurationSec && asset.durationSeconds > creator.maxVideoPostDurationSec) throw new Error("The creator's TikTok video duration limit changed after approval; reconnect or choose a shorter video.");
  if (!creator.privacyLevelOptions.includes(input.privacyLevel)) throw new Error("The approved TikTok privacy level is no longer available for this creator.");
  if (input.allowComment && creator.commentDisabled) throw new Error("TikTok comments are now disabled for this creator.");
  if (input.allowDuet && creator.duetDisabled) throw new Error("TikTok duet is now disabled for this creator.");
  if (input.allowStitch && creator.stitchDisabled) throw new Error("TikTok stitch is now disabled for this creator.");

  const plan = chunkPlan(asset.sizeBytes);
  const initResponse = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      post_info: {
        title: text(input.title, 2200),
        privacy_level: input.privacyLevel,
        disable_duet: creator.duetDisabled || !input.allowDuet,
        disable_comment: creator.commentDisabled || !input.allowComment,
        disable_stitch: creator.stitchDisabled || !input.allowStitch,
        brand_content_toggle: input.brandContent,
        brand_organic_toggle: input.brandOrganic,
        is_aigc: input.isAigc,
      },
      source_info: { source: "FILE_UPLOAD", video_size: asset.sizeBytes, chunk_size: plan.chunkSize, total_chunk_count: plan.totalChunks },
    }),
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  const raw = (await initResponse.text()).slice(0, 20_000);
  let payload: Record<string, any> = {};
  try { payload = JSON.parse(raw) as Record<string, any>; } catch { throw new Error(`TikTok returned an unreadable video-init response (${initResponse.status}).`); }
  if (!initResponse.ok || payload?.error?.code !== "ok") throw new Error(String(payload?.error?.message ?? `TikTok video initialization failed (${initResponse.status}).`).slice(0, 500));
  const publishId = validPublishId(payload?.data?.publish_id);
  const uploadUrl = text(payload?.data?.upload_url, 1000);
  if (!uploadUrl.startsWith("https://")) throw new Error("TikTok did not return a valid video upload URL.");

  let offset = 0;
  for (let index = 0; index < plan.totalChunks; index += 1) {
    const isLast = index === plan.totalChunks - 1;
    const end = isLast ? asset.sizeBytes - 1 : Math.min(offset + plan.chunkSize, asset.sizeBytes) - 1;
    const bytes = await readTrustedVideoRange(asset, offset, end);
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Range": `bytes ${offset}-${end}/${asset.sizeBytes}`,
      },
      body: bytes,
      signal: input.signal ?? AbortSignal.timeout(90_000),
    });
    const expected = isLast ? 201 : 206;
    if (upload.status !== expected) throw new Error(`TikTok video transfer failed after dispatch (${upload.status}).`);
    offset = end + 1;
  }
  if (offset !== asset.sizeBytes) throw new Error("TikTok video transfer did not consume the verified asset length.");
  return { publishId };
}
