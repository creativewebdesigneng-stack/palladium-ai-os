const BUCKET = "three-d-studio";

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Buffer,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl?: string } | null; error: { message: string } | null }>;
      createSignedUploadUrl: (
        path: string,
        options?: { upsert?: boolean },
      ) => Promise<{
        data: { signedUrl?: string; token?: string } | null;
        error: { message: string } | null;
      }>;
      list: (
        prefix: string,
        options?: { search?: string },
      ) => Promise<{
        data: Array<{ name: string; metadata?: { size?: number } }> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

async function admin(): Promise<StorageClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as StorageClient;
}

export async function storeMeshBytes(userId: string, name: string, base64: string) {
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 128 || bytes.length > 40_000_000)
    throw new Error("Generated mesh is an unusable size.");
  const path = `${userId}/jobs/${name}.glb`;
  const storage = await admin();
  const uploaded = await storage.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "model/gltf-binary", upsert: false });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const signed = await signStoragePath(path);
  if (!signed) throw new Error("Could not sign the generated mesh.");
  return { path, url: signed };
}

export async function signStoragePath(path: string) {
  const storage = await admin();
  const signed = await storage.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? null;
}

export async function createOwnedUploadUrl(
  userId: string,
  uploadId: string,
  extension: "glb" | "gltf",
) {
  const path = `${userId}/uploads/${uploadId}.${extension}`;
  const storage = await admin();
  const signed = await storage.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.signedUrl || !signed.data.token) {
    throw new Error(signed.error?.message ?? "Could not prepare the model upload.");
  }
  return { path, uploadUrl: signed.data.signedUrl, token: signed.data.token };
}

export async function uploadedByteSize(path: string) {
  const slash = path.lastIndexOf("/");
  const prefix = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const storage = await admin();
  const listed = await storage.storage.from(BUCKET).list(prefix, { search: name });
  if (listed.error) throw new Error(listed.error.message);
  const match = (listed.data ?? []).find((item) => item.name === name);
  return match?.metadata?.size ?? null;
}
