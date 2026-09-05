import { describe, expect, it } from "vitest";
import { planTikTokVideoChunks } from "../tiktok-video.server";
import { planYouTubeUploadChunks } from "../youtube-video.server";
import { TIKTOK_VIDEO_INPUT_SCHEMA } from "../tiktok-video-actions.server";
import { YOUTUBE_VIDEO_INPUT_SCHEMA } from "../youtube-video-actions.server";

describe("trusted media provider video contracts", () => {
  it("plans TikTok FILE_UPLOAD chunks without gaps or overlap", () => {
    const size = 50 * 1024 * 1024 + 123;
    const chunks = planTikTokVideoChunks(size);
    expect(chunks[0]?.start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(size - 1);
    for (let i = 1; i < chunks.length; i += 1) expect(chunks[i]!.start).toBe(chunks[i - 1]!.end + 1);
    expect(chunks.reduce((sum, chunk) => sum + chunk.length, 0)).toBe(size);
    expect(chunks.length).toBeLessThanOrEqual(1000);
  });

  it("uses YouTube chunks aligned to 256 KiB except the final chunk", () => {
    const size = 23 * 1024 * 1024 + 17;
    const chunks = planYouTubeUploadChunks(size);
    expect(chunks[0]?.start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(size - 1);
    for (const chunk of chunks.slice(0, -1)) expect(chunk.length % (256 * 1024)).toBe(0);
    expect(chunks.reduce((sum, chunk) => sum + chunk.length, 0)).toBe(size);
  });

  it("accepts only opaque trusted media asset IDs, not source URLs", () => {
    const tiktok = JSON.stringify(TIKTOK_VIDEO_INPUT_SCHEMA);
    const youtube = JSON.stringify(YOUTUBE_VIDEO_INPUT_SCHEMA);
    expect(tiktok).toContain("trusted_media_asset_id");
    expect(youtube).toContain("trusted_media_asset_id");
    expect(tiktok).not.toMatch(/source_url|video_url|download_url/i);
    expect(youtube).not.toMatch(/source_url|video_url|download_url/i);
  });
});
