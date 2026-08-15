import { describe, expect, it } from "vitest";
import { assessIntegrationHealth } from "../integration-health";

describe("integration health", () => {
  it("requires reconnect when a connected account is missing a newly required scope", () => {
    const health = assessIntegrationHealth({
      providerName: "Microsoft 365",
      requiredScopes: ["Mail.ReadWrite", "Mail.Send"],
      grantedScopes: ["Mail.ReadWrite"],
      status: "connected",
      hasRefreshToken: true,
    });
    expect(health.state).toBe("reconnect_required");
    expect(health.missingScopes).toEqual(["Mail.Send"]);
  });

  it("keeps an expired connection healthy when it can refresh", () => {
    const health = assessIntegrationHealth({
      providerName: "Google Workspace",
      requiredScopes: ["scope-a"],
      grantedScopes: ["scope-a"],
      status: "connected",
      expiresAt: "2026-01-01T00:00:00.000Z",
      hasRefreshToken: true,
      nowMs: Date.parse("2026-08-15T20:00:00.000Z"),
    });
    expect(health.state).toBe("healthy");
  });

  it("requires reconnect when an expired connection has no refresh token", () => {
    const health = assessIntegrationHealth({
      providerName: "Google Workspace",
      requiredScopes: [],
      grantedScopes: [],
      status: "connected",
      expiresAt: "2026-01-01T00:00:00.000Z",
      hasRefreshToken: false,
      nowMs: Date.parse("2026-08-15T20:00:00.000Z"),
    });
    expect(health.reconnectRequired).toBe(true);
    expect(health.reason).toContain("cannot be refreshed");
  });

  it("surfaces provider error connections as reconnect required", () => {
    const health = assessIntegrationHealth({
      providerName: "Slack",
      requiredScopes: [],
      status: "error",
      lastError: "Access expired — reconnect required.",
    });
    expect(health.state).toBe("reconnect_required");
    expect(health.reason).toBe("Access expired — reconnect required.");
  });
});
