import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TRUSTED_MEDIA_MAX_BYTES, TRUSTED_MEDIA_MAX_MB } from "./trusted-media-policy";

const BUCKET = "trusted-media";
const MAX_VIDEO_BYTES = TRUSTED_MEDIA_MAX_BYTES;
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

type Mp4Box = { start: number; size: number; header: number; type: string };
function fourcc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}
function mp4Box(bytes: Uint8Array, start: number, end: number): Mp4Box | null {
  const size32 = readU32(bytes, start);
  if (size32 === null || start + 8 > bytes.length) return null;
  const extended = size32 === 1 ? readU64(bytes, start + 8) : null;
  const size = size32 === 0 ? end - start : size32 === 1 ? Number(extended ?? -1n) : size32;
  const header = size32 === 1 ? 16 : 8;
  if (!Number.isSafeInteger(size) || size < header || start + header > bytes.length || start + size > end) return null;
  return { start, size, header, type: fourcc(bytes, start + 4) };
}
function mp4Children(bytes: Uint8Array, start: number, end: number): Mp4Box[] | null {
  const boxes: Mp4Box[] = [];
  while (start < end && boxes.length < 4096) {
    const box = mp4Box(bytes, start, end);
    if (!box || box.start + box.size > bytes.length) return null;
    boxes.push(box); start += box.size;
  }
  return start === end ? boxes : null;
}
/** Container metadata verification, not codec decoding or malware scanning. Never scan media payload for a loose mvhd signature. */
export function mp4DurationSeconds(bytes: Uint8Array, total = bytes.length, tail?: { bytes: Uint8Array; offset: number }): number | null {
  if (!Number.isSafeInteger(total) || total < bytes.length || (tail && (tail.offset < 0 || tail.offset + tail.bytes.length !== total))) return null;
  const ftyp = mp4Box(bytes, 0, total);
  if (!ftyp || ftyp.type !== 'ftyp' || ftyp.size < ftyp.header + 8 || ftyp.size > bytes.length) return null;
  const brands = [fourcc(bytes, ftyp.header)];
  for (let at = ftyp.header + 8; at + 4 <= ftyp.size; at += 4) brands.push(fourcc(bytes, at));
  if (!brands.some(brand => /^(isom|iso[2-9]|mp4[12]|avc1|dash|M4V )$/.test(brand))) return null;
  let offset = 0, duration: number | null = null, video = false, media = false, count = 0;
  while (offset < total && count++ < 512) {
    let segment = offset + 8 <= bytes.length ? { bytes, offset: 0 } : tail && offset >= tail.offset ? tail : null;
    if (!segment) return null;
    let local = offset - segment.offset, box = mp4Box(segment.bytes, local, total - segment.offset);
    if ((!box || box.type === 'moov' && local + box.size > segment.bytes.length) && tail && offset >= tail.offset) {
      segment = tail; local = offset - tail.offset; box = mp4Box(tail.bytes, local, total - tail.offset);
    }
    if (!box) return null;
    if (box.type === 'mdat' && box.size > box.header) media = true;
    if (box.type === 'moov') {
      if (duration !== null || local + box.size > segment.bytes.length) return null;
      const children = mp4Children(segment.bytes, local + box.header, local + box.size);
      const headers = children?.filter(child => child.type === 'mvhd') ?? [];
      if (!children || headers.length !== 1) return null;
      const movie = headers[0]!, payload = movie.start + movie.header, version = segment.bytes[payload];
      if (version !== 0 && version !== 1 || movie.size < movie.header + (version === 1 ? 112 : 100)) return null;
      const scale = readU32(segment.bytes, payload + (version === 1 ? 20 : 12));
      const ticks = version === 1 ? Number(readU64(segment.bytes, payload + 24) ?? -1n) : readU32(segment.bytes, payload + 16);
      if (!scale || ticks === null || !Number.isSafeInteger(ticks) || ticks <= 0) return null;
      duration = ticks / scale;
      for (const track of children.filter(child => child.type === 'trak')) {
        const trackChildren = mp4Children(segment.bytes, track.start + track.header, track.start + track.size);
        if (!trackChildren) return null;
        for (const mdia of trackChildren.filter(child => child.type === 'mdia')) {
          const mediaChildren = mp4Children(segment.bytes, mdia.start + mdia.header, mdia.start + mdia.size);
          if (!mediaChildren) return null;
          if (mediaChildren.some(child => child.type === 'hdlr' && child.size >= child.header + 24 && fourcc(segment.bytes, child.start + child.header + 8) === 'vide')) video = true;
        }
      }
    }
    offset += box.size;
  }
  return offset === total && video && media && duration !== null && Number.isFinite(duration) ? duration : null;
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
  const reader = response.body?.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) while (true) {
    const next = await reader.read(); if (next.done) break;
    length += next.value.byteLength;
    if (length > end - start + 1) { await reader.cancel(); throw new Error("Trusted media exceeded the bounded verification range."); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return {
    bytes,
    total: contentLengthFromRange(response),
    type: (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase(),
  };
}

async function verifyMp4(sb: any, objectPath: string): Promise<{ sizeBytes: number; durationSeconds: number }> {
  const url = await signedObjectUrl(sb, objectPath);
  const first = await ranged(url, 0, VERIFY_CHUNK_BYTES - 1);
  const sizeBytes = first.total;
  if (!sizeBytes || sizeBytes < 24 || sizeBytes > MAX_VIDEO_BYTES) {
    throw new Error(`Trusted media size is invalid or exceeds the ${TRUSTED_MEDIA_MAX_MB} MB governed upload limit.`);
  }
  if (first.type && first.type !== "video/mp4" && first.type !== "application/octet-stream") {
    throw new Error(`Trusted media returned an unexpected content type: ${first.type}.`);
  }
  let duration = mp4DurationSeconds(first.bytes, sizeBytes);
  if (!duration && sizeBytes > VERIFY_CHUNK_BYTES) {
    const start = Math.max(0, sizeBytes - VERIFY_CHUNK_BYTES);
    const tail = await ranged(url, start, sizeBytes - 1);
    if (tail.total !== sizeBytes) throw new Error("Trusted media size changed during verification.");
    duration = mp4DurationSeconds(first.bytes, sizeBytes, { bytes: tail.bytes, offset: start });
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: asset, error } = await sb.from("trusted_media_assets")
      .select("id,object_path,filename,mime_type,status,size_bytes,duration_seconds,verified_at")
      .eq("id", data.assetId).eq("user_id", context.userId).single();
    if (error || !asset) throw error ?? new Error("Trusted media asset not found.");
    if (String(asset.object_path) !== `${context.userId}/${asset.id}/${asset.filename}`) throw new Error("Trusted media path does not match its owner and asset ID.");
    if (asset.status === "ready") {
      const size = Number(asset.size_bytes), duration = Number(asset.duration_seconds);
      if (!asset.verified_at || !Number.isFinite(Date.parse(String(asset.verified_at))) || !Number.isSafeInteger(size) || size<24 || size>MAX_VIDEO_BYTES || !Number.isFinite(duration) || duration<=0 || duration>43200) throw new Error("Trusted media verification metadata is incomplete.");
      return asset;
    }
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
