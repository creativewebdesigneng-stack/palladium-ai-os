import { getIntegrationAccessToken } from "./oauth.server";
import { getTrustedVideoAsset, readTrustedVideoRange } from "@/lib/media/trusted-media.server";

export const YOUTUBE_VIDEO_ACTION = "youtube_video_upload" as const;
const CHUNK_BYTES = 8 * 1024 * 1024;

export const YOUTUBE_VIDEO_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["asset_id", "title", "privacy_status"],
  properties: {
    asset_id: { type: "string", format: "uuid" },
    title: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", maxLength: 5000 },
    privacy_status: { type: "string", enum: ["private", "unlisted", "public"] },
    made_for_kids: { type: "boolean" },
  },
  additionalProperties: false,
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function binaryBody(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function hasNativeYouTubeUploadConnection(userId: string): Promise<boolean> {
  return Boolean(await getIntegrationAccessToken(userId, "youtube"));
}

export async function prepareYouTubeVideoAction(input: {
  userId: string;
  provider: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  if (input.provider !== "youtube" || input.action !== YOUTUBE_VIDEO_ACTION) throw new Error(`Native YouTube does not expose ${input.provider}:${input.action}.`);
  if (!(await hasNativeYouTubeUploadConnection(input.userId))) throw new Error("YouTube is not connected through its native OAuth integration.");
  const asset = await getTrustedVideoAsset(input.userId, input.actionInput["asset_id"]);
  const title = text(input.actionInput["title"], 100);
  if (!title) throw new Error("A YouTube video title is required.");
  const privacy = text(input.actionInput["privacy_status"], 20);
  if (!new Set(["private", "unlisted", "public"]).has(privacy)) throw new Error("Choose a valid YouTube privacy status.");
  return {
    provider: "youtube",
    action: YOUTUBE_VIDEO_ACTION,
    description: "Upload an approved trusted MP4 video to the connected YouTube channel through the native resumable upload API.",
    risk: "medium" as const,
    requiresApproval: true,
    input: {
      asset_id: asset.id,
      title,
      description: text(input.actionInput["description"], 5000),
      privacy_status: privacy,
      made_for_kids: input.actionInput["made_for_kids"] === true,
    },
  };
}

export async function uploadYouTubeTrustedVideo(input: {
  userId: string;
  assetId: string;
  title: string;
  description?: string;
  privacyStatus: string;
  madeForKids: boolean;
  signal?: AbortSignal;
}): Promise<{ videoId: string }> {
  const token = await getIntegrationAccessToken(input.userId, "youtube");
  if (!token) throw new Error("YouTube is not connected or its access has expired.");
  const asset = await getTrustedVideoAsset(input.userId, input.assetId);
  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  const init = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(asset.sizeBytes),
      "X-Upload-Content-Type": asset.mimeType,
    },
    body: JSON.stringify({
      snippet: { title: text(input.title, 100), description: text(input.description, 5000) },
      status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: input.madeForKids },
    }),
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  if (!init.ok) throw new Error(`YouTube upload session initialization failed (${init.status}): ${(await init.text()).slice(0, 500)}`);
  const sessionUrl = init.headers.get("location");
  if (!sessionUrl?.startsWith("https://")) throw new Error("YouTube did not return a resumable upload session URL.");

  let offset = 0;
  while (offset < asset.sizeBytes) {
    const end = Math.min(offset + CHUNK_BYTES, asset.sizeBytes) - 1;
    const bytes = await readTrustedVideoRange(asset, offset, end);
    const response = await fetch(sessionUrl, {
      method: "PUT",
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Range": `bytes ${offset}-${end}/${asset.sizeBytes}`,
      },
      body: binaryBody(bytes),
      signal: input.signal ?? AbortSignal.timeout(60_000),
    });
    if (response.status === 308) {
      offset = end + 1;
      continue;
    }
    if (!response.ok) throw new Error(`YouTube video upload failed after dispatch (${response.status}): ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as Record<string, unknown>;
    const videoId = text(payload["id"], 160);
    if (!videoId) throw new Error("YouTube completed the upload without returning a video ID.");
    return { videoId };
  }
  throw new Error("YouTube upload ended without a terminal provider response.");
}
