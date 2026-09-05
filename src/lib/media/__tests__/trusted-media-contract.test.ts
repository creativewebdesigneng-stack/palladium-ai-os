import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260905203000_trusted_media_assets.sql", "utf8");
const functions = readFileSync("src/lib/media/trusted-media.functions.ts", "utf8");

describe("trusted media contract", () => {
  it("keeps media private, owner-scoped and unavailable to anonymous users", () => {
    expect(migration).toContain("'trusted-media', 'trusted-media', false");
    expect(migration).toContain("create table if not exists public.trusted_media_assets");
    expect(migration).toContain("alter table public.trusted_media_assets enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(migration).toContain("revoke all on public.trusted_media_assets from anon");
  });

  it("accepts only bounded MP4 uploads and never arbitrary source URLs", () => {
    expect(migration).toContain("536870912");
    expect(migration).toContain("array['video/mp4']");
    expect(functions).toContain("createSignedUploadUrl");
    expect(functions).toContain("Trusted social video currently accepts MP4 files only");
    expect(functions).toContain("Range: `bytes=${start}-${end}`");
    expect(functions).toContain("mp4DurationSeconds");
    expect(functions).not.toMatch(/sourceUrl|source_url|remoteUrl|remote_url|downloadUrl|download_url/);
  });

  it("marks assets ready only after server-side size, MIME and duration verification", () => {
    expect(functions).toContain("sizeBytes > MAX_VIDEO_BYTES");
    expect(functions).toContain('first.type !== "video/mp4"');
    expect(functions).toContain("Could not verify a valid MP4 duration from trusted storage");
    expect(functions).toContain('status: "ready"');
    expect(functions).toContain('status: "invalid"');
    expect(functions).toContain('.eq("user_id", context.userId)');
  });
});
