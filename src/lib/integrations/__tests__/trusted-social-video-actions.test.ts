import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtime = readFileSync("src/lib/integrations/agent-integration-runtime.server.ts", "utf8");
const youtube = readFileSync("src/lib/integrations/youtube-video-actions.server.ts", "utf8");
const tiktok = readFileSync("src/lib/integrations/tiktok-video-actions.server.ts", "utf8");
const media = readFileSync("src/lib/media/trusted-media.server.ts", "utf8");

describe("trusted native social video publishing", () => {
  it("advertises YouTube and TikTok video only as approval-gated direct OAuth actions", () => {
    expect(runtime).toContain('YOUTUBE_VIDEO_ACTION');
    expect(runtime).toContain('TIKTOK_VIDEO_ACTION');
    expect(runtime).toContain('transport: "direct_oauth"');
    expect(runtime).toContain('requiresApproval: true');
    expect(runtime).toContain('safeToFailover: false');
  });

  it("resolves only ready owner-owned trusted assets and never accepts arbitrary media URLs", () => {
    expect(media).toContain('.eq("user_id", userId).eq("status", "ready")');
    expect(media).toContain('objectPath.startsWith(`${userId}/${trustedId}/`)');
    expect(youtube).toContain('asset_id');
    expect(tiktok).toContain('asset_id');
    expect(youtube).not.toMatch(/source_url|remote_url|video_url/);
    expect(tiktok).not.toMatch(/source_url|remote_url|PULL_FROM_URL/);
  });

  it("streams verified ranges into provider upload protocols", () => {
    expect(youtube).toContain('uploadType", "resumable"');
    expect(youtube).toContain('Content-Range');
    expect(youtube).toContain('readTrustedVideoRange');
    expect(tiktok).toContain('/v2/post/publish/video/init/');
    expect(tiktok).toContain('source: "FILE_UPLOAD"');
    expect(tiktok).toContain('Content-Range');
    expect(tiktok).toContain('readTrustedVideoRange');
  });

  it("rechecks TikTok creator controls and verified duration at preparation and dispatch", () => {
    expect(tiktok.match(/queryTikTokCreatorInfo/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(tiktok.match(/maxVideoPostDurationSec/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(tiktok).toContain('creator.duetDisabled');
    expect(tiktok).toContain('creator.stitchDisabled');
    expect(tiktok).toContain('music_usage_confirmed');
  });
});
