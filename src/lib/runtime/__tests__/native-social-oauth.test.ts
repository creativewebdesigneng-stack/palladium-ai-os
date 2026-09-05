import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, refreshTokens } from "@/lib/integrations/oauth.server";
import { findProvider } from "@/lib/integrations/providers";

const previousClientKey = process.env["TIKTOK_INTEGRATION_CLIENT_KEY"];
const previousClientSecret = process.env["TIKTOK_INTEGRATION_CLIENT_SECRET"];

beforeEach(() => {
  process.env["TIKTOK_INTEGRATION_CLIENT_KEY"] = "tt-client-key";
  process.env["TIKTOK_INTEGRATION_CLIENT_SECRET"] = "tt-client-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousClientKey === undefined) delete process.env["TIKTOK_INTEGRATION_CLIENT_KEY"];
  else process.env["TIKTOK_INTEGRATION_CLIENT_KEY"] = previousClientKey;
  if (previousClientSecret === undefined) delete process.env["TIKTOK_INTEGRATION_CLIENT_SECRET"];
  else process.env["TIKTOK_INTEGRATION_CLIENT_SECRET"] = previousClientSecret;
});

describe("native TikTok OAuth contract", () => {
  it("uses client_key and comma-separated scopes in the authorization URL", () => {
    const provider = findProvider("tiktok");
    expect(provider).toBeTruthy();
    const url = new URL(buildAuthorizeUrl(provider!, {
      state: "signed-state",
      origin: "https://blackstar.lovable.app",
    }));

    expect(url.origin).toBe("https://www.tiktok.com");
    expect(url.pathname).toBe("/v2/auth/authorize/");
    expect(url.searchParams.get("client_key")).toBe("tt-client-key");
    expect(url.searchParams.has("client_id")).toBe(false);
    expect(url.searchParams.get("scope")).toBe("user.info.basic,video.publish");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("refreshes with client_key/client_secret and stores a rotated refresh token", async () => {
    const provider = findProvider("tiktok");
    expect(provider).toBeTruthy();
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      expect(body.get("client_key")).toBe("tt-client-key");
      expect(body.get("client_secret")).toBe("tt-client-secret");
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh");
      expect(body.has("client_id")).toBe(false);
      return new Response(JSON.stringify({
        access_token: "new-access",
        expires_in: 86400,
        refresh_token: "rotated-refresh",
        refresh_expires_in: 31536000,
        scope: "user.info.basic,video.publish",
        token_type: "Bearer",
        open_id: "open-123",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await refreshTokens(provider!, "old-refresh");
    expect(tokens.accessToken).toBe("new-access");
    expect(tokens.refreshToken).toBe("rotated-refresh");
    expect(tokens.scopes).toEqual(["user.info.basic", "video.publish"]);
    expect(tokens.providerConfig).toEqual({ open_id: "open-123" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
