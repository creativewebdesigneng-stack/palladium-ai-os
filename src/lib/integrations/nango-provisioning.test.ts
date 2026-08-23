import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NANGO_PROVIDERS } from "./nango-providers";
import { nangoIntegrationId, provisionNangoIntegrations } from "./nango.server";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Nango management provisioning", () => {
  beforeEach(() => {
    vi.stubEnv("NANGO_SECRET_KEY", "test-environment-key");
    for (const provider of NANGO_PROVIDERS) vi.stubEnv(provider.env, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses stable integration IDs when optional environment overrides are absent", () => {
    expect(nangoIntegrationId("github")).toBe("github-getting-started");
    expect(nangoIntegrationId("google")).toBe("palladium-google");
    expect(nangoIntegrationId("microsoft")).toBe("palladium-microsoft");
    expect(nangoIntegrationId("linear")).toBe("palladium-linear");
  });

  it("creates only missing fixed-list integrations", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (!init?.method) {
        return response({
          data: [{ unique_key: "github-getting-started", provider: "github" }],
        });
      }
      return response({ data: JSON.parse(String(init.body)) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await provisionNangoIntegrations();

    expect(results).toHaveLength(9);
    expect(results[0]).toMatchObject({ id: "github", status: "existing" });
    expect(results.slice(1).every((result) => result.status === "created")).toBe(true);
    const createCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(createCalls).toHaveLength(8);
    expect(
      createCalls.map(([, init]) => JSON.parse(String(init?.body))).map((body) => body.unique_key),
    ).toEqual([
      "palladium-google",
      "palladium-microsoft",
      "palladium-slack",
      "palladium-hubspot",
      "palladium-salesforce",
      "palladium-notion",
      "palladium-asana",
      "palladium-linear",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-environment-key");
    }
  });

  it("does not overwrite an integration ID assigned to another provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          data: NANGO_PROVIDERS.map((provider) => ({
            unique_key: nangoIntegrationId(provider.id),
            provider: provider.id === "slack" ? "google" : provider.id,
          })),
        }),
      ),
    );

    const results = await provisionNangoIntegrations();
    expect(results.find((result) => result.id === "slack")).toMatchObject({
      status: "error",
      error: "Integration ID is already assigned to google.",
    });
  });
});
