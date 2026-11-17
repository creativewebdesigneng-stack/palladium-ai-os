import { describe, expect, it } from "vitest";
import { featureForPath } from "./route-features";

describe("launch route ownership", () => {
  it("maps nested feature routes to their parent feature", () => {
    expect(featureForPath("/mission-control/runs/123")).toBe("mission_control");
    expect(featureForPath("/agents/123")).toBe("agent_runtime");
    expect(featureForPath("/workflows/123/edit")).toBe("automation");
  });

  it("maps customer billing and dashboard routes", () => {
    expect(featureForPath("/billing/invoices")).toBe("billing");
    expect(featureForPath("/dashboard")).toBe("dashboard");
  });

  it("fails closed for unregistered application routes", () => {
    expect(featureForPath("/unknown-module")).toBeNull();
    expect(featureForPath("/admin/secret")).toBeNull();
  });
});
