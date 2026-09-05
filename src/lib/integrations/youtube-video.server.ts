import { createTrustedMediaReadUrlForUser, readTrustedMediaRange } from "@/lib/media/trusted-media.server";
import { getIntegrationAccessToken } from "./oauth.server";
import { discoverYouTubeChannels } from "./youtube-social.server";

const YOUTUBE_UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";
const CHUNK_BYTES = 8 * 1024 * 1024;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export type YouTubeUploadChunk = { start: number; end: number; length: number };
export function planYouTubeUploadChunks(sizeBytes: number): YouTubeUploadChunk[] {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 512 * 1024 * 1024) throw new Error("YouTube video size is outside the governed range.");
  const chunks: YouTubeUploadChunk[] = [];
  for (let start = 0; start < sizeBytes; start += CHUNK_BYTES) {
    const end = Math.min(sizeBytes - 1, start + CHUNK_BYTES - 1);
    chunks.push({ start, end, length: end - start + 1 });
  }
  return chunks;
}

async function finalVideoId(response: Response): Promise<string | null> {
  const raw = (await response.text()).slice(0, 36_000);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    return text(payload["id"], 160) || null;
  } catch { return null; }
}

export async function uploadYouTubeVideo(input: {
  userId: string;
  trustedMediaAssetId: string;
  channelId: string;
  title: string;
  description?: string;
  privacyStatus: "private" | "unlisted" | "public";
  madeForKids: boolean;
  notifySubscribers: boolean;
  signal?: AbortSignal;
}): Promise<{ videoId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "youtube");
  if (!token) throw new Error("YouTube is not connected or its access has expired.");
  const channels = await discoverYouTubeChannels(input.userId, input.signal);
  if (!channels.some((channel) => channel.id === input.channelId)) throw new Error("The selected YouTube channel is no longer owned by the connected account.");
  const { asset, url } = await createTrustedMediaReadUrlForUser(input.userId, input.trustedMediaAssetId, 3600);

  const initiateUrl = new URL(YOUTUBE_UPLOAD);
  initiateUrl.searchParams.set("uploadType", "resumable");
  initiateUrl.searchParams.set("part", "snippet,status");
  initiateUrl.searchParams.set("notifySubscribers", input.notifySubscribers ? "true" : "false");
  const initiate = await fetch(initiateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(asset.sizeBytes),
      "X-Upload-Content-Type": asset.mimeType,
    },
    body: JSON.stringify({
      snippet: { title: text(input.title, 100), ...(text(input.description, 5000) ? { description: text(input.description, 5000) } : {}) },
      status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: input.madeForKids },
    }),
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  if (!initiate.ok) {
    const message = text(await initiate.text(), 500);
    throw new Error(message || `YouTube resumable upload initialization failed (${initiate.status}).`);
  }
  const sessionUrl = initiate.headers.get("location") ?? "";
  if (!sessionUrl.startsWith("https://")) throw new Error("YouTube did not return a secure resumable upload session URL.");

  let videoId: string | null = null;
  for (const chunk of planYouTubeUploadChunks(asset.sizeBytes)) {
    const bytes = await readTrustedMediaRange({ url, start: chunk.start, end: chunk.end, totalSize: asset.sizeBytes, ...(input.signal ? { signal: input.signal } : {}) });
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    const response = await fetch(sessionUrl, {
      method: "PUT",
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Range": `bytes ${chunk.start}-${chunk.end}/${asset.sizeBytes}`,
      },
      body,
      signal: input.signal ?? AbortSignal.timeout(60_000),
    });
    if (response.status === 308) continue;
    if (!response.ok) throw new Error(`YouTube video upload failed after provider initialization (${response.status}).`);
    videoId = await finalVideoId(response);
  }
  if (!videoId) throw new Error("YouTube completed the upload without returning a video ID.");
  return { videoId };
}
