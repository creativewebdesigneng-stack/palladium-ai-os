import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "trusted-media";
const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
const VERIFY_CHUNK_BYTES = 4 * 1024 * 1024;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F]/g, "").trim().slice(0, max) : "";
}

function uuid(value: unknown, label: string): string {
  const id = clean(value, 60);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`A valid ${label} is required.`);
  }
  return id;
}

function safeFilename(value: unknown): string {
  const raw = clean(value, 180).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const filename = raw || "video.mp4";
  if (!/\.mp4$/i.test(filename)) throw new Error("Trusted social video currently accepts MP4 files only.");
  return filename.slice(0, 180);
}

function readU32(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

function readU64(bytes: Uint8Array, offset: number): bigint | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  const hi = readU32(bytes, offset);
  const lo = readU32(bytes, offset + 4);
  if (hi === null || lo === null) return null;
  return (BigInt(hi) << 32n) | BigInt(lo);
}

/** Extracts MP4 movie duration from an mvhd atom contained in a verified range. */
export function mp4DurationSeconds(bytes: Uint8Array): number | null {
  for (let index = 4; index + 24 < bytes.length; index += 1) {
    if (bytes[index] !== 0x6d || bytes[index + 1] !== 0x76 || bytes[index + 2] !== 0x68 || bytes[index + 3] !== 0x64) continue;
    const atomStart = index - 4;
    const atomSize = readU32(bytes, atomStart);
    if (!atomSize || atomSize < 24 || atomStart + atomSize > bytes.length) continue;
    const payload = index + 4;
    const version = bytes[payload];
    if (version === 0) {
      const timescale = readU32(bytes, payload + 12);
      const duration = readU32(bytes, payload + 16);
      if (timescale && duration !== null) return duration / timescale;
    } else if (version === 1) {
      const timescale = readU32(bytes, payload + 20);
      const duration = readU64(bytes, payload + 24);
      if (timescale && duration !== null) return Number(duration) / timescale;
    }
  }
  return null;
}

function contentLengthFromRange(response: Response): number | null {
  const range = response.headers.get("content-range");
  const match = range?.match(/\/(\d+)$/);
  if (match) return Number(match[1]);
  const length = response.headers.get("content-length");
  return length && /^\d+$/.test(length) ? Number(length) : null;
}

async function signedObjectUrl(sb: any, objectPath: string, expiresIn = 120): Promise<string> {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(objectPath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create a trusted media read URL.");
  return String(data.signedUrl);
}

async function ranged(url: string, start: number, end: number): Promise<{ bytes: Uint8Array; total: number | null; type: string }> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!(response.ok || response.status === 206)) throw new Error(`Trusted media verification failed (${response.status}).`);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    total: contentLengthFromRange(response),
    type: (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase(),
  };
}

async function verifyMp4(sb: any, objectPath: string): Promise<{ sizeBytes: number; durationSeconds: number }> {
  const url = await signedObjectUrl(sb, objectPath);
  const first = await ranged(url, 0, VERIFY_CHUNK_BYTES - 1);
  const sizeBytes = first.total;
  if (!sizeBytes || sizeBytes < 24 || sizeBytes > MAX_VIDEO_BYTES) {
    throw new Error("Trusted media size is invalid or exceeds the 512 MB governed upload limit.");
  }
  if (first.type && first.type !== "video/mp4" && first.type !== "application/octet-stream") {
    throw new Error(`Trusted media returned an unexpected content type: ${first.type}.`);
  }
  let duration = mp4DurationSeconds(first.bytes);
  if (!duration && sizeBytes > VERIFY_CHUNK_BYTES) {
    const start = Math.max(0, sizeBytes - VERIFY_CHUNK_BYTES);
    const tail = await ranged(url, start, sizeBytes - 1);
    duration = mp4DurationSeconds(tail.bytes);
  }
  if (!duration || !Number.isFinite(duration) || duration <= 0 || duration > 12 * 60 * 60) {
    throw new Error("Could not verify a valid MP4 duration from trusted storage.");
  }
  return { sizeBytes, durationSeconds: Math.round(duration * 1000) / 1000 };
}

export const beginTrustedMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { filename: string; mimeType?: string }) => ({
    filename: safeFilename(input?.filename),
    mimeType: clean(input?.mimeType, 100).toLowerCase() || "video/mp4",
  }))
  .handler(async ({ data, context }) => {
    if (data.mimeType !== "video/mp4") throw new Error("Trusted social video currently accepts video/mp4 only.");
    const sb = context.supabase as any;
    const { data: asset, error: insertError } = await sb.from("trusted_media_assets").insert({
      user_id: context.userId,
      filename: data.filename,
      mime_type: "video/mp4",
      object_path: `${context.userId}/pending/${crypto.randomUUID()}/${data.filename}`,
      status: "uploading",
    }).select("id,object_path").single();
    if (insertError || !asset?.id) throw insertError ?? new Error("Could not create the trusted media asset.");

    const finalPath = `${context.userId}/${asset.id}/${data.filename}`;
    const { data: moved, error: pathError } = await sb.from("trusted_media_assets")
      .update({ object_path: finalPath, updated_at: new Date().toISOString() })
      .eq("id", asset.id).eq("user_id", context.userId).eq("status", "uploading")
      .select("id").single();
    if (pathError || !moved?.id) throw pathError ?? new Error("Could not bind the trusted media path.");

    const { data: signed, error: signedError } = await sb.storage.from(BUCKET).createSignedUploadUrl(finalPath, { upsert: false });
    if (signedError || !signed?.signedUrl) {
      await sb.from("trusted_media_assets").update({ status: "invalid", last_error: "Could not create upload URL." })
        .eq("id", asset.id).eq("user_id", context.userId);
      throw signedError ?? new Error("Could not create the trusted media upload URL.");
    }
    return { assetId: String(asset.id), uploadUrl: String(signed.signedUrl), objectPath: finalPath, mimeType: "video/mp4" };
  });

export const finalizeTrustedMediaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assetId: string }) => ({ assetId: uuid(input?.assetId, "trusted media asset ID") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: asset, error } = await sb.from("trusted_media_assets")
      .select("id,object_path,filename,mime_type,status,size_bytes,duration_seconds")
      .eq("id", data.assetId).eq("user_id", context.userId).single();
    if (error || !asset) throw error ?? new Error("Trusted media asset not found.");
    if (asset.status === "ready") return asset;
    if (asset.status !== "uploading") throw new Error("This trusted media asset is not eligible for verification.");

    try {
      const verified = await verifyMp4(sb, String(asset.object_path));
      const { data: ready, error: readyError } = await sb.from("trusted_media_assets").update({
        status: "ready",
        size_bytes: verified.sizeBytes,
        duration_seconds: verified.durationSeconds,
        verified_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", data.assetId).eq("user_id", context.userId).eq("status", "uploading")
        .select("id,filename,mime_type,size_bytes,duration_seconds,status,verified_at").single();
      if (readyError || !ready) throw readyError ?? new Error("Could not mark trusted media ready.");
      return ready;
    } catch (verificationError) {
      const message = verificationError instanceof Error ? verificationError.message : "Trusted media verification failed.";
      await sb.from("trusted_media_assets").update({
        status: "invalid", last_error: message.slice(0, 1000), updated_at: new Date().toISOString(),
      }).eq("id", data.assetId).eq("user_id", context.userId).eq("status", "uploading");
      throw new Error(message);
    }
  });

export const listTrustedMediaAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => ({ limit: Math.min(Math.max(Number(input.limit ?? 25) || 25, 1), 100) }))
  .handler(async ({ data, context }) => {
    const { data: assets, error } = await (context.supabase as any).from("trusted_media_assets")
      .select("id,filename,mime_type,size_bytes,duration_seconds,status,last_error,verified_at,created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return assets ?? [];
  });
