import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, createState, exchangeCode, xPkceChallenge, xPkceVerifier } from "./oauth.server";
import { findProvider } from "./providers";

function xProvider() {
  const provider = findProvider("x");
  if (!provider) throw new Error("X provider is missing from the integration catalogue.");
  return provider;
}

describe("native X OAuth contract", () => {
  beforeEach(() => {
    process.env["INTEGRATION_STATE_SECRET"] = "test-state-secret";
    process.env["X_INTEGRATION_CLIENT_ID"] = "x-client-id";
    process.env["X_INTEGRATION_CLIENT_SECRET"] = "x-client-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["INTEGRATION_STATE_SECRET"];
    delete process.env["X_INTEGRATION_CLIENT_ID"];
    delete process.env["X_INTEGRATION_CLIENT_SECRET"];
  });

  it("uses signed-state-derived S256 PKCE and the required native scopes", () => {
    const provider = xProvider();
    const state = createState({ userId: "user-1", provider: "x", origin: "https://blackstar.example" });
    const verifier = xPkceVerifier(state);
    const challenge = xPkceChallenge(state);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toBe(verifier);

    const url = new URL(buildAuthorizeUrl(provider, { state, origin: "https://blackstar.example" }));
    expect(url.origin + url.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("x-client-id");
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(expect.arrayContaining([
      "tweet.read", "tweet.write", "users.read", "offline.access",
    ]));
  });

  it("keeps the client secret out of the token request body and sends the PKCE verifier", async () => {
    const provider = xProvider();
    const state = createState({ userId: "user-1", provider: "x", origin: "https://blackstar.example" });
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams(String(init?.body ?? ""));
      expect(headers.get("authorization")).toBe(`Basic ${Buffer.from("x-client-id:x-client-secret").toString("base64")}`);
      expect(body.get("client_secret")).toBeNull();
      expect(body.get("client_id")).toBeNull();
      expect(body.get("code_verifier")).toBe(xPkceVerifier(state));
      expect(body.get("redirect_uri")).toBe("https://blackstar.example/api/public/integrations/callback");
      return new Response(JSON.stringify({
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 7200,
        scope: "tweet.read tweet.write users.read offline.access",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await exchangeCode(provider, {
      code: "authorization-code",
      origin: "https://blackstar.example",
      state,
    });
    expect(tokens.accessToken).toBe("access");
    expect(tokens.refreshToken).toBe("refresh");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
