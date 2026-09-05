import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, exchangeCode, refreshTokens } from "./oauth.server";
import { INTEGRATION_PROVIDERS } from "./providers";

const provider = INTEGRATION_PROVIDERS.find((item) => item.id === "threads");
if (!provider) throw new Error("Threads provider missing");

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("native Threads OAuth contract", () => {
  beforeEach(() => {
    process.env["THREADS_INTEGRATION_CLIENT_ID"] = "threads-client";
    process.env["THREADS_INTEGRATION_CLIENT_SECRET"] = "threads-secret";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("builds the current Threads authorization contract with comma-separated scopes", () => {
    const url = new URL(buildAuthorizeUrl(provider, {
      state: "signed-state",
      origin: "https://blackstar.example",
    }));
    expect(url.origin + url.pathname).toBe("https://threads.net/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("threads-client");
    expect(url.searchParams.get("redirect_uri")).toBe("https://blackstar.example/api/public/integrations/callback");
    expect(url.searchParams.get("scope")).toBe("threads_basic,threads_content_publish");
  });

  it("exchanges the code, upgrades to a long-lived token and keeps safe user identity config", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, ...(init ? { init } : {}) });
      if (url.startsWith("https://graph.threads.net/oauth/access_token")) {
        return jsonResponse({ access_token: "short-token", user_id: "123456" });
      }
      if (url.startsWith("https://graph.threads.net/access_token")) {
        return jsonResponse({ access_token: "long-token", token_type: "bearer", expires_in: 5184000 });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    }) as typeof fetch;

    const result = await exchangeCode(provider, {
      code: "auth-code",
      origin: "https://blackstar.example",
    });

    expect(calls).toHaveLength(2);
    const first = new URL(calls[0]!.url);
    expect(calls[0]!.init?.method).toBe("POST");
    expect(first.searchParams.get("client_id")).toBe("threads-client");
    expect(first.searchParams.get("client_secret")).toBe("threads-secret");
    expect(first.searchParams.get("code")).toBe("auth-code");
    expect(first.searchParams.get("grant_type")).toBe("authorization_code");

    const second = new URL(calls[1]!.url);
    expect(second.pathname).toBe("/access_token");
    expect(second.searchParams.get("grant_type")).toBe("th_exchange_token");
    expect(second.searchParams.get("client_secret")).toBe("threads-secret");
    expect(new Headers(calls[1]!.init?.headers).get("Authorization")).toBe("Bearer short-token");

    expect(result.accessToken).toBe("long-token");
    expect(result.refreshToken).toBe("long-token");
    expect(result.scopes).toEqual(["threads_basic", "threads_content_publish"]);
    expect(result.providerConfig).toEqual({ user_id: "123456" });
    expect(Date.parse(result.expiresAt ?? "")).toBeGreaterThan(Date.now() + 59 * 24 * 60 * 60 * 1000);
  });

  it("refreshes a long-lived Threads token using the bearer-token refresh flow", async () => {
    let seenUrl = "";
    let seenAuth = "";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenAuth = new Headers(init?.headers).get("Authorization") ?? "";
      return jsonResponse({ access_token: "new-long-token", token_type: "bearer", expires_in: 5184000 });
    }) as typeof fetch;

    const result = await refreshTokens(provider, "old-long-token");
    const url = new URL(seenUrl);
    expect(url.origin + url.pathname).toBe("https://graph.threads.net/refresh_access_token");
    expect(url.searchParams.get("grant_type")).toBe("th_refresh_token");
    expect(seenAuth).toBe("Bearer old-long-token");
    expect(result.accessToken).toBe("new-long-token");
    expect(result.refreshToken).toBe("new-long-token");
  });
});
