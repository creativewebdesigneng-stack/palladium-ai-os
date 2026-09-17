import { describe, expect, it } from "vitest";
import { assistantConnectionContext, summariseAssistantConnections } from "../assistant-connection-inspection";

describe("assistant connection inspection", () => {
  it("exposes bounded provider health without credentials", () => {
    const summaries = summariseAssistantConnections([
      {
        providerId: "google",
        health: {
          state: "healthy",
          healthy: true,
          reconnectRequired: false,
          missingScopes: [],
          reason: null,
        },
      },
      {
        providerId: "slack",
        health: {
          state: "reconnect_required",
          healthy: false,
          reconnectRequired: true,
          missingScopes: ["chat:write"],
          reason: "Reconnect required",
        },
      },
    ]);

    expect(summaries.find((item) => item.providerId === "google")?.state).toBe("healthy");
    expect(summaries.find((item) => item.providerId === "slack")?.missingScopes).toEqual(["chat:write"]);
    expect(summaries.find((item) => item.providerId === "shopify")?.state).toBe("disconnected");
  });

  it("makes the no-secret and no-execution boundary explicit", () => {
    const context = assistantConnectionContext(summariseAssistantConnections([]));
    expect(context).toContain("Never request, expose or infer OAuth tokens, API keys, passwords");
    expect(context).toContain("does not authorise provider actions");
    expect(context).not.toContain("clientSecretEnv");
    expect(context).not.toContain("clientIdEnv");
  });
});
