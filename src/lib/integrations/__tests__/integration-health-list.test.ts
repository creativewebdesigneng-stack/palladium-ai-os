import { describe, expect, it } from "vitest";
import { assessIntegrationHealth } from "../integration-health";

describe("safe integration health contract", () => {
  it("never needs token material to decide reconnect state", () => {
    const input = {
      providerName: "Microsoft 365",
      requiredScopes: ["Mail.ReadWrite", "Mail.Send"],
      grantedScopes: ["Mail.ReadWrite"],
      status: "connected",
      expiresAt: null,
      hasRefreshToken: true,
      lastError: null,
    };
    const health = assessIntegrationHealth(input);
    expect(health).toEqual(expect.objectContaining({
      state: "reconnect_required",
      reconnectRequired: true,
      missingScopes: ["Mail.Send"],
    }));
    expect(JSON.stringify(health)).not.toMatch(/cipher|token/i);
  });
});
