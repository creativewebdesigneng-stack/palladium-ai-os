import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findProvider } from "./providers";
import {
  buildAuthorizeUrl,
  exchangeCode,
  salesforcePkceChallenge,
  salesforcePkceVerifier,
} from "./oauth.server";

const ORIGINAL_ENV = { ...process.env };

describe("Salesforce OAuth PKCE", () => {
  beforeEach(() => {
    process.env["INTEGRATION_STATE_SECRET"] = "test-state-secret-with-enough-entropy";
    process.env["SALESFORCE_INTEGRATION_CLIENT_ID"] = "salesforce-client-id";
    process.env["SALESFORCE_INTEGRATION_CLIENT_SECRET"] = "salesforce-client-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("requests the exact scopes configured in the Salesforce External Client App", () => {
    const provider = findProvider("salesforce");
    expect(provider?.scopes).toEqual(["api", "refresh_token", "id"]);
  });

  it("adds an S256 challenge without exposing the verifier in the authorization URL", () => {
    const provider = findProvider("salesforce");
    if (!provider) throw new Error("Salesforce provider missing");
    const state = "signed.oauth.state";
    const url = new URL(buildAuthorizeUrl(provider, { state, origin: "https://palladium-ai-os.lovable.app" }));

    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(salesforcePkceChallenge(state));
    expect(url.searchParams.get("code_challenge")).not.toBe(salesforcePkceVerifier(state));
    expect(url.searchParams.has("code_verifier")).toBe(false);
    expect(url.searchParams.get("scope")).toBe("api refresh_token id");
  });

  it("sends the matching verifier and server secret during code exchange", async () => {
    const provider = findProvider("salesforce");
    if (!provider) throw new Error("Salesforce provider missing");
    const state = "signed.oauth.state";
    let tokenBody = "";

    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      tokenBody = String(init?.body ?? "");
      return new Response(JSON.stringify({
        access_token: "access-token",
        refresh_token: "refresh-token-2",
        token_type: "Bearer",
        instance_url: "https://example.my.salesforce.com",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));

    const tokens = await exchangeCode(provider, {
      code: "authorization-code",
      origin: "https://palladium-ai-os.lovable.app",
      state,
    });
    const body = new URLSearchParams(tokenBody);

    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe("salesforce-client-id");
    expect(body.get("client_secret")).toBe("salesforce-client-secret");
    expect(body.get("code_verifier")).toBe(salesforcePkceVerifier(state));
    expect(tokens.refreshToken).toBe("refresh-token-2");
    expect(tokens.scopes).toEqual(["api", "refresh_token", "id"]);
    expect(tokens.providerConfig).toEqual({ instance_url: "https://example.my.salesforce.com" });
  });

  it("requires the original signed state when Salesforce PKCE is enabled", async () => {
    const provider = findProvider("salesforce");
    if (!provider) throw new Error("Salesforce provider missing");
    await expect(exchangeCode(provider, {
      code: "authorization-code",
      origin: "https://palladium-ai-os.lovable.app",
    })).rejects.toThrow("Salesforce authorization state is required to complete PKCE");
  });
});
