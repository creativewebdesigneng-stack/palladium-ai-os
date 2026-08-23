import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NANGO_PROVIDERS } from "./nango-providers";
import {
  deployNangoActionTemplate,
  ensureNangoIntegration,
  listNangoIntegrationActions,
  listNangoProviderActionTemplates,
  listNangoProviderCatalogue,
  nangoIntegrationId,
  nangoProviderFromIntegrationId,
  provisionNangoIntegrations,
} from "./nango.server";

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
    expect(nangoIntegrationId("posthog")).toBe("palladium-posthog");
    expect(nangoProviderFromIntegrationId("palladium-posthog")).toMatchObject({ id: "posthog" });
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

  it("creates a missing provider just in time before Connect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Not found" }, 404))
      .mockResolvedValueOnce(
        response({ data: { unique_key: "palladium-google", provider: "google" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(ensureNangoIntegration("google")).resolves.toEqual({
      integrationId: "palladium-google",
      created: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCall = fetchMock.mock.calls[0]!;
    const secondCall = fetchMock.mock.calls[1]!;
    expect(String(firstCall[0])).toContain("/integrations/palladium-google");
    expect(secondCall[1]?.method).toBe("POST");
    expect(JSON.parse(String(secondCall[1]?.body))).toMatchObject({
      unique_key: "palladium-google",
      provider: "google",
    });
  });

  it("loads and normalizes Nango's live provider marketplace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          data: [
            {
              name: "posthog",
              display_name: "PostHog",
              categories: ["dev-tools"],
              auth_mode: "API_KEY",
              logo_url: "https://app.nango.dev/posthog.svg",
              docs: "https://nango.dev/docs/api-integrations/posthog",
            },
            { name: "../../unsafe", display_name: "Unsafe" },
          ],
        }),
      ),
    );

    await expect(listNangoProviderCatalogue()).resolves.toEqual([
      expect.objectContaining({
        id: "posthog",
        name: "PostHog",
        category: "dev-tools",
        authMode: "API_KEY",
        curated: false,
      }),
    ]);
  });

  it("discovers typed template and deployed actions", async () => {
    const action = {
      name: "list-repositories",
      type: "action",
      description: "List repositories",
      input: "ListInput",
      json_schema: { definitions: { ListInput: { type: "object" } } },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: [action, { name: "issues", type: "sync" }] }))
      .mockResolvedValueOnce(response({ data: [{ ...action, enabled: true }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listNangoProviderActionTemplates("github")).resolves.toEqual([
      expect.objectContaining({ name: "list-repositories", type: "action" }),
    ]);
    await expect(listNangoIntegrationActions("github-getting-started")).resolves.toEqual([
      expect.objectContaining({ name: "list-repositories", type: "action" }),
    ]);
    expect(String(fetchMock.mock.calls[1]![0])).toContain("type=action");
  });

  it("activates one action template just in time with an explicit action type", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      response({ id: "deployment-1", status: "success" }, 202),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deployNangoActionTemplate("github-getting-started", "list-repositories"),
    ).resolves.toEqual({ deployed: true, deploymentId: "deployment-1" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      type: "template",
      integration_id: "github-getting-started",
      template: "list-repositories",
      function_type: "action",
    });
  });

  it("verifies a marketplace provider before creating its integration", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ data: { name: "posthog", display_name: "PostHog", auth_mode: "API_KEY" } }),
      )
      .mockResolvedValueOnce(response({ message: "Not found" }, 404))
      .mockResolvedValueOnce(
        response({ data: { unique_key: "palladium-posthog", provider: "posthog" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(ensureNangoIntegration("posthog")).resolves.toEqual({
      integrationId: "palladium-posthog",
      created: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/providers/posthog");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("/integrations/palladium-posthog");
  });

  it("keeps Connect tied to the just-in-time integration check", () => {
    const source = readFileSync("src/lib/integrations/nango.server.ts", "utf8");
    const connectSession = source.slice(
      source.indexOf("export async function createNangoConnectSession"),
      source.indexOf("export async function listOwnedNangoConnections"),
    );
    expect(connectSession).toContain("await ensureNangoIntegration(providerId)");
    expect(connectSession).toContain("allowed_integrations: [integrationId]");
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
