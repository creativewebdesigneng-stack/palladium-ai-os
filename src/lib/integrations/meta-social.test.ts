import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeForLongLivedMetaToken, metaGraphUrl } from "./meta-social.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("native Meta social API", () => {
  it("builds version-pinned Graph API URLs and rejects unsafe versions", () => {
    expect(metaGraphUrl("me/accounts", "v99.0").toString()).toBe(
      "https://graph.facebook.com/v99.0/me/accounts",
    );
    expect(() => metaGraphUrl("me/accounts", "latest")).toThrow("Invalid Meta Graph API version");
    expect(() => metaGraphUrl("../oauth/access_token", "v99.0")).toThrow("Invalid Meta Graph API path");
  });

  it("exchanges a short-lived token without leaking the app secret into the request body", async () => {
    vi.stubEnv("META_GRAPH_API_VERSION", "v99.0");
    vi.stubEnv("META_INTEGRATION_CLIENT_ID", "meta-client");
    vi.stubEnv("META_INTEGRATION_CLIENT_SECRET", "meta-secret");
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://graph.facebook.com");
      expect(url.pathname).toBe("/v99.0/oauth/access_token");
      expect(url.searchParams.get("grant_type")).toBe("fb_exchange_token");
      expect(url.searchParams.get("client_id")).toBe("meta-client");
      expect(url.searchParams.get("client_secret")).toBe("meta-secret");
      expect(url.searchParams.get("fb_exchange_token")).toBe("short-user-token");
      return new Response(JSON.stringify({ access_token: "long-user-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const before = Date.now();
    const result = await exchangeForLongLivedMetaToken("short-user-token");
    const after = Date.now();
    expect(result.accessToken).toBe("long-user-token");
    expect(result.expiresAt).not.toBeNull();
    const expiry = new Date(result.expiresAt!).getTime();
    expect(expiry).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(expiry).toBeLessThanOrEqual(after + 3_600_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the Graph API version is not explicitly configured", async () => {
    vi.stubEnv("META_GRAPH_API_VERSION", "");
    vi.stubEnv("META_INTEGRATION_CLIENT_ID", "meta-client");
    vi.stubEnv("META_INTEGRATION_CLIENT_SECRET", "meta-secret");
    await expect(exchangeForLongLivedMetaToken("short-user-token")).rejects.toThrow(
      "META_GRAPH_API_VERSION",
    );
  });
});
