import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTikTokPublishStatus } from "./tiktok-social.server";
import * as oauth from "./oauth.server";

const originalFetch = globalThis.fetch;

describe("TikTok publish status polling", () => {
  beforeEach(() => {
    vi.spyOn(oauth, "getIntegrationAccessToken").mockResolvedValue("tiktok-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts the publish ID and returns a normalized completed status", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tiktok-token");
      expect(JSON.parse(String(init?.body))).toEqual({ publish_id: "p_pub_url~v2.123456789" });
      return new Response(JSON.stringify({
        data: {
          status: "PUBLISH_COMPLETE",
          publicaly_available_post_id: [1234567890123456789n.toString()],
          downloaded_bytes: 12345,
        },
        error: { code: "ok", message: "" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    const result = await fetchTikTokPublishStatus({
      userId: "user-1",
      publishId: "p_pub_url~v2.123456789",
    });

    expect(result).toEqual({
      publishId: "p_pub_url~v2.123456789",
      status: "PUBLISH_COMPLETE",
      failReason: null,
      publiclyAvailablePostIds: ["1234567890123456789"],
      uploadedBytes: null,
      downloadedBytes: 12345,
    });
  });

  it("returns safe failure details", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      data: {
        status: "FAILED",
        fail_reason: "picture_size_check_failed",
        publicaly_available_post_id: [],
      },
      error: { code: "ok", message: "" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

    const result = await fetchTikTokPublishStatus({
      userId: "user-1",
      publishId: "p_pub_url~v2.123456789",
    });
    expect(result.status).toBe("FAILED");
    expect(result.failReason).toBe("picture_size_check_failed");
  });

  it("rejects malformed publish IDs before dispatch", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    await expect(fetchTikTokPublishStatus({ userId: "user-1", publishId: "bad id" }))
      .rejects.toThrow("valid TikTok publish ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
