const BUCKET = "trusted-media";

export type VerifiedTrustedMediaAsset = {
  id: string;
  objectPath: string;
  filename: string;
  mimeType: "video/mp4";
  sizeBytes: number;
  durationSeconds: number;
};

function uuid(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("A valid trusted media asset ID is required.");
  }
  return id;
}

export async function getVerifiedTrustedMediaAsset(
  sb: any,
  userId: string,
  assetId: string,
): Promise<VerifiedTrustedMediaAsset> {
  const id = uuid(assetId);
  const { data, error } = await sb.from("trusted_media_assets")
    .select("id,object_path,filename,mime_type,size_bytes,duration_seconds,status")
    .eq("id", id).eq("user_id", userId).eq("status", "ready").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Trusted media asset is not verified and ready for publishing.");
  const sizeBytes = Number(data.size_bytes);
  const durationSeconds = Number(data.duration_seconds);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 512 * 1024 * 1024) {
    throw new Error("Trusted media asset has an invalid verified size.");
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Trusted media asset has an invalid verified duration.");
  }
  if (data.mime_type !== "video/mp4") throw new Error("Trusted media asset is not a verified MP4 video.");
  return {
    id: String(data.id), objectPath: String(data.object_path), filename: String(data.filename),
    mimeType: "video/mp4", sizeBytes, durationSeconds,
  };
}

export async function createTrustedMediaReadUrl(sb: any, asset: VerifiedTrustedMediaAsset, expiresIn = 900): Promise<string> {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(asset.objectPath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create trusted media read URL.");
  return String(data.signedUrl);
}

export async function readTrustedMediaRange(input: {
  url: string;
  start: number;
  end: number;
  totalSize: number;
  signal?: AbortSignal;
}): Promise<Uint8Array> {
  if (!Number.isSafeInteger(input.start) || !Number.isSafeInteger(input.end) || input.start < 0 || input.end < input.start || input.end >= input.totalSize) {
    throw new Error("Trusted media byte range is invalid.");
  }
  const response = await fetch(input.url, {
    headers: { Range: `bytes=${input.start}-${input.end}` },
    signal: input.signal ?? AbortSignal.timeout(30_000),
  });
  if (!(response.status === 206 || (input.start === 0 && input.end === input.totalSize - 1 && response.ok))) {
    throw new Error(`Trusted media range read failed (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const expected = input.end - input.start + 1;
  if (bytes.byteLength !== expected) throw new Error("Trusted media range returned an unexpected byte count.");
  return bytes;
}
