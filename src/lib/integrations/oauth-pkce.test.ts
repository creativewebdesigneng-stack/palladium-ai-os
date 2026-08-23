import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  createAuthorization,
  createState,
  deriveCodeChallenge,
  exchangeCode,
  refreshTokens,
  verifyState,
} from "./oauth.server";
import { INTEGRATION_PROVIDERS } from "./providers";

const provider = (id: string) => {
  const found = INTEGRATION_PROVIDERS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing provider ${id}`);
  return found;
};

const salesforce = provider("salesforce");
const slack = provider("slack");

beforeEach(() => {
  process.env["INTEGRATION_STATE_SECRET"] = "test-state-secret";
  for (const p of [salesforce, slack]) {
    process.env[p.clientIdEnv] = `${p.id}-client-id`;
    process.env[p.clientSecretEnv] = `${p.id}-client-secret`;
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function tokenFetch(payload: Record<string, unknown>) {
  const bodies: string[] = [];
  const fetchMock = vi.fn(async (_url: any, init: any) => {
    bodies.push(String(init?.body ?? ""));
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { bodies };
}

describe("Salesforce OAuth PKCE", () => {
  it("puts an S256 challenge on the authorize URL and never the verifier", () => {
    const { state, authorizeUrl } = createAuthorization(salesforce, {
      userId: "user-1",
      origin: "https://app.lovable.app",
    });
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const challenge = url.searchParams.get("code_challenge")!;
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get("code_verifier")).toBeNull();

    const verifier = verifyState(state)!.codeVerifier!;
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(authorizeUrl).not.toContain(verifier);
    expect(challenge).toBe(deriveCodeChallenge(verifier));
    expect(challenge).toBe(
      createHash("sha256").update(verifier).digest("base64url"),
    );
  });

  it("refuses to yield the verifier from a tampered or expired state", () => {
    const state = createState({
      userId: "user-1",
      provider: "salesforce",
      origin: "https://app.lovable.app",
      codeVerifier: "verifier-value",
    });
    expect(verifyState(state)?.codeVerifier).toBe("verifier-value");

    const [payload, signature] = state.split(".") as [string, string];
    expect(verifyState(`${payload}x.${signature}`)).toBeNull();
    expect(verifyState(`${payload}.${signature.slice(0, -1)}A`)).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(verifyState(state)).toBeNull();
  });

  it("sends code_verifier plus the client secret in the Salesforce exchange", async () => {
    const { bodies } = tokenFetch({
      access_token: "sf-access",
      refresh_token: "sf-refresh",
      instance_url: "https://acme.my.salesforce.com",
    });
    await exchangeCode(salesforce, {
      code: "auth-code",
      origin: "https://app.lovable.app",
      codeVerifier: "verifier-value",
    });
    const body = new URLSearchParams(bodies[0]!);
    expect(body.get("code_verifier")).toBe("verifier-value");
    expect(body.get("client_secret")).toBe("salesforce-client-secret");
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("fails closed when a Salesforce exchange has no verifier", async () => {
    const { bodies } = tokenFetch({ access_token: "sf-access" });
    await expect(
      exchangeCode(salesforce, { code: "auth-code", origin: "https://app.lovable.app" }),
    ).rejects.toThrow(/PKCE/);
    expect(bodies).toHaveLength(0);
  });

  it("leaves non-Salesforce providers unchanged", async () => {
    const { authorizeUrl, state } = createAuthorization(slack, {
      userId: "user-1",
      origin: "https://app.lovable.app",
    });
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("code_challenge")).toBeNull();
    expect(url.searchParams.get("code_challenge_method")).toBeNull();
    expect(verifyState(state)?.codeVerifier).toBeNull();

    const { bodies } = tokenFetch({ access_token: "slack-access", scope: "chat:write" });
    await exchangeCode(slack, { code: "auth-code", origin: "https://app.lovable.app" });
    expect(new URLSearchParams(bodies[0]!).get("code_verifier")).toBeNull();
  });

  it("preserves refresh-token rotation behavior", async () => {
    tokenFetch({ access_token: "a1", refresh_token: "rotated" });
    expect((await refreshTokens(salesforce, "old")).refreshToken).toBe("rotated");

    tokenFetch({ access_token: "a2" });
    expect((await refreshTokens(salesforce, "old")).refreshToken).toBe("old");
  });
});
