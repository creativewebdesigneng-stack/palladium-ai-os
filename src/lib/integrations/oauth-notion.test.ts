import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeCode, refreshTokens } from "./oauth.server";
import { findProvider } from "./providers";

const originalClientId = process.env.NOTION_INTEGRATION_CLIENT_ID;
const originalClientSecret = process.env.NOTION_INTEGRATION_CLIENT_SECRET;

beforeEach(() => {
  process.env.NOTION_INTEGRATION_CLIENT_ID = "notion-client";
  process.env.NOTION_INTEGRATION_CLIENT_SECRET = "notion-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalClientId === undefined) delete process.env.NOTION_INTEGRATION_CLIENT_ID;
  else process.env.NOTION_INTEGRATION_CLIENT_ID = originalClientId;
  if (originalClientSecret === undefined) delete process.env.NOTION_INTEGRATION_CLIENT_SECRET;
  else process.env.NOTION_INTEGRATION_CLIENT_SECRET = originalClientSecret;
});

describe("Notion OAuth", () => {
  it("uses Basic auth and a JSON body for authorization-code exchange", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push([input, init]);
        return new Response(
          JSON.stringify({
            access_token: "notion-access",
            refresh_token: "notion-refresh",
            token_type: "bearer",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const provider = findProvider("notion");
    expect(provider).toBeDefined();
    const token = await exchangeCode(provider!, {
      code: "auth-code",
      origin: "https://app.example.com",
    });

    expect(token.accessToken).toBe("notion-access");
    expect(String(calls[0]![0])).toBe("https://api.notion.com/v1/oauth/token");
    const init = calls[0]![1]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Notion-Version"]).toBe("2026-03-11");
    expect(headers["Authorization"]).toBe(
      `Basic ${Buffer.from("notion-client:notion-secret", "utf8").toString("base64")}`,
    );
    expect(JSON.parse(String(init.body))).toEqual({
      grant_type: "authorization_code",
      code: "auth-code",
      redirect_uri: "https://app.example.com/api/public/integrations/callback",
    });
  });

  it("uses the Notion JSON refresh flow and preserves the old refresh token when omitted", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push([input, init]);
        return new Response(JSON.stringify({ access_token: "fresh-access", token_type: "bearer" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const provider = findProvider("notion");
    expect(provider).toBeDefined();
    const token = await refreshTokens(provider!, "old-refresh");

    expect(token.accessToken).toBe("fresh-access");
    expect(token.refreshToken).toBe("old-refresh");
    expect(JSON.parse(String(calls[0]![1]?.body))).toEqual({
      grant_type: "refresh_token",
      refresh_token: "old-refresh",
    });
  });
});
