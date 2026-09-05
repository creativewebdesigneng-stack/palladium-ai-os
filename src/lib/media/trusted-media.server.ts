import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "trusted-media";
const READ_TTL_SECONDS = 15 * 60;

export type TrustedVideoAsset = {
  id: string;
  userId: string;
  objectPath: string;
  filename: string;
  mimeType: "video/mp4";
  sizeBytes: number;
  durationSeconds: number;
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function assetId(value: unknown): string {
  const id = clean(value, 60);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("A valid trusted media asset ID is required.");
  }
  return id;
}

export async function getTrustedVideoAsset(userId: string, id: unknown): Promise<TrustedVideoAsset> {
  const trustedId = assetId(id);
  // The migration introducing this table lands with this code. Generated
  // database types are refreshed separately by Lovable/Supabase, so keep this
  // one new-table access dynamically typed while retaining explicit row checks.
  const db = supabaseAdmin as any;
  const { data, error } = await db.from("trusted_media_assets")
    .select("id,user_id,bucket,object_path,filename,mime_type,size_bytes,duration_seconds,status")
    .eq("id", trustedId).eq("user_id", userId).eq("status", "ready").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Trusted media asset is not ready or does not belong to this user.");
  if (data.bucket !== BUCKET || data.mime_type !== "video/mp4") throw new Error("Trusted media asset is not an approved MP4 video.");
  const sizeBytes = Number(data.size_bytes);
  const durationSeconds = Number(data.duration_seconds);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Trusted media asset verification metadata is incomplete.");
  }
  const objectPath = clean(data.object_path, 1000);
  if (!objectPath.startsWith(`${userId}/${trustedId}/`)) throw new Error("Trusted media object path does not match its owner and asset ID.");
  return {
    id: trustedId,
    userId,
    objectPath,
    filename: clean(data.filename, 180) || "video.mp4",
    mimeType: "video/mp4",
    sizeBytes,
    durationSeconds,
  };
}

export async function createTrustedVideoReadUrl(asset: TrustedVideoAsset): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(asset.objectPath, READ_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not read trusted media from private storage.");
  return String(data.signedUrl);
}

export async function readTrustedVideoRange(asset: TrustedVideoAsset, start: number, endInclusive: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endInclusive) || start < 0 || endInclusive < start || endInclusive >= asset.sizeBytes) {
    throw new Error("Trusted media byte range is invalid.");
  }
  const url = await createTrustedVideoReadUrl(asset);
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${endInclusive}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!(response.ok || response.status === 206)) throw new Error(`Trusted media range read failed (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const expected = endInclusive - start + 1;
  if (bytes.byteLength !== expected) throw new Error("Trusted media range length did not match the verified asset ledger.");
  return bytes;
}
