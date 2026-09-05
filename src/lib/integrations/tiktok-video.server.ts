import { createTrustedMediaReadUrlForUser, readTrustedMediaRange } from "@/lib/media/trusted-media.server";
import { getIntegrationAccessToken } from "./oauth.server";
import { queryTikTokCreatorInfo } from "./tiktok-social.server";

const TIKTOK_API = "https://open.tiktokapis.com";
const CHUNK_BYTES = 16 * 1024 * 1024;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function publishId(value: unknown): string {
  const id = clean(value, 100);
  if (!/^[A-Za-z0-9._~-]{6,100}$/.test(id)) throw new Error("TikTok did not return a valid publish ID.");
  return id;
}
async function json(response: Response, context: string): Promise<Record<string, unknown>> {
  const raw = (await response.text()).slice(0, 36_000);
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; }
  catch { throw new Error(`TikTok returned an unreadable ${context} response (${response.status}).`); }
  const error = payload["error"] && typeof payload["error"] === "object" && !Array.isArray(payload["error"])
    ? payload["error"] as Record<string, unknown> : {};
  const code = clean(error["code"], 120);
  if (!response.ok || (code && code !== "ok")) throw new Error(clean(error["message"], 300) || `TikTok returned ${response.status}.`);
  return payload;
}

export type TikTokVideoChunk = { start: number; end: number; length: number };
export function planTikTokVideoChunks(sizeBytes: number): TikTokVideoChunk[] {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 512 * 1024 * 1024) throw new Error("TikTok video size is outside the governed range.");
  if (sizeBytes <= CHUNK_BYTES) return [{ start: 0, end: sizeBytes - 1, length: sizeBytes }];
  const totalChunkCount = Math.max(1, Math.floor(sizeBytes / CHUNK_BYTES));
  if (totalChunkCount > 1000) throw new Error("TikTok video would require too many upload chunks.");
  const chunks: TikTokVideoChunk[] = [];
  for (let index = 0; index < totalChunkCount; index += 1) {
    const start = index * CHUNK_BYTES;
    const end = index === totalChunkCount - 1 ? sizeBytes - 1 : start + CHUNK_BYTES - 1;
    chunks.push({ start, end, length: end - start + 1 });
  }
  const final = chunks[chunks.length - 1]!;
  if (chunks.length > 1 && final.length > 128 * 1024 * 1024) throw new Error("TikTok final upload chunk exceeds provider limits.");
  return chunks;
}

export async function publishTikTokVideoPost(input: {
  userId: string;
  trustedMediaAssetId: string;
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  title?: string;
  signal?: AbortSignal;
}): Promise<{ publishId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "tiktok");
  if (!token) throw new Error("TikTok is not connected or its access has expired.");
  const { asset, url } = await createTrustedMediaReadUrlForUser(input.userId, input.trustedMediaAssetId, 3600);
  const creator = await queryTikTokCreatorInfo(input.userId, input.signal);
  if (!creator.privacyLevelOptions.includes(input.privacyLevel)) throw new Error("The selected TikTok privacy level is no longer available.");
  if (creator.maxVideoPostDurationSec && asset.durationSeconds > creator.maxVideoPostDurationSec) throw new Error("Video duration now exceeds the creator's TikTok limit.");
  if (input.allowComment && creator.commentDisabled) throw new Error("TikTok comments are disabled for this creator.");
  if (input.allowDuet && creator.duetDisabled) throw new Error("TikTok duets are disabled for this creator.");
  if (input.allowStitch && creator.stitchDisabled) throw new Error("TikTok stitches are disabled for this creator.");

  const chunks = planTikTokVideoChunks(asset.sizeBytes);
  const init = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      post_info: {
        ...(clean(input.title, 150) ? { title: clean(input.title, 150) } : {}),
        privacy_level: input.privacyLevel,
        disable_comment: creator.commentDisabled || !input.allowComment,
        disable_duet: creator.duetDisabled || !input.allowDuet,
        disable_stitch: creator.stitchDisabled || !input.allowStitch,
        brand_content_toggle: input.brandContent,
        brand_organic_toggle: input.brandOrganic,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: asset.sizeBytes,
        chunk_size: chunks[0]!.length,
        total_chunk_count: chunks.length,
      },
    }),
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  const payload = await json(init, "video-init");
  const data = payload["data"] && typeof payload["data"] === "object" && !Array.isArray(payload["data"])
    ? payload["data"] as Record<string, unknown> : {};
  const id = publishId(data["publish_id"]);
  const uploadUrl = clean(data["upload_url"], 3000);
  if (!uploadUrl.startsWith("https://")) throw new Error("TikTok did not return a secure upload URL.");

  for (const chunk of chunks) {
    const bytes = await readTrustedMediaRange({ url, start: chunk.start, end: chunk.end, totalSize: asset.sizeBytes, ...(input.signal ? { signal: input.signal } : {}) });
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(bytes.byteLength),
        "Content-Range": `bytes ${chunk.start}-${chunk.end}/${asset.sizeBytes}`,
      },
      body,
      signal: input.signal ?? AbortSignal.timeout(60_000),
    });
    if (!response.ok && response.status !== 201) throw new Error(`TikTok video upload failed after provider initialization (${response.status}).`);
  }
  return { publishId: id };
}
