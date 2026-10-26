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


describe("Mission Control whole-word routing", () => {
  it.each([
    "Native Astra acceptance test. Without tools, browsing, memory writes or external actions: calculate 17 × 23 and give one sentence explaining the calculation. End with ASTRA_AGENT_OK. /no_think",
    "Calculate 17 * 23. /no_think",
    "Think carefully about this arithmetic problem",
  ])("keeps local reasoning out of Live Explorer: %s", (request) => {
    const decision = routeRequest(request);
    expect(decision.category).toBe("custom");
    expect(decision.requiredTools).toEqual([]);
    expect(decision.requiresApproval).toBe(false);
  });

  it.each(["Find compatible printer ink", "Compare laptops under £500", "Find office chairs", "Show shopping deals"])("preserves genuine shopping discovery: %s", (request) => {
    const decision = routeRequest(request);
    expect(decision.category).toBe("shopping");
    expect(decision.requiredTools).toContain("browser");
    expect(decision.requiresApproval).toBe(false);
  });

  it("keeps purchase approval requirements", () => {
    expect(routeRequest("Without tools, buy printer ink under £30").requiresApproval).toBe(true);
    expect(routeRequest("Buy printer ink under £30").requiresApproval).toBe(true);
  });
});
