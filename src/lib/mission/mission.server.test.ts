import { describe, expect, it } from "vitest";
import { routeRequest } from "./mission.server";

describe("routeRequest connected-service routing", () => {
  it("exposes dynamic Nango tools for an unassigned GitHub request", () => {
    const decision = routeRequest(
      "Using my connected GitHub account through Nango, list my three most recently updated repositories.",
    );

    expect(decision.category).toBe("integration");
    expect(decision.requiredTools).toEqual([
      "connected_service",
      "nango_capabilities",
      "nango_action",
    ]);
    expect(decision.requiresApproval).toBe(false);
  });

  it("does not treat ordinary web research as a connected-service request", () => {
    const decision = routeRequest("Research the latest AI agent frameworks");

    expect(decision.category).toBe("research");
    expect(decision.requiredTools).not.toContain("nango_action");
  });
});
