import { describe, expect, it } from "vitest";
import { analyseAgentImprovement } from "../agent-improvement";

describe("agent improvement intelligence", () => {
  it("turns recurring verifier and re-plan failures into concrete recommendations", () => {
    const report = analyseAgentImprovement([
      { status: "failed", error: "verification threshold failed", replan_count: 3, verification_state: { issues: ["Missing citations"] } },
      { status: "failed", error: "verification threshold failed", replan_count: 2, verification_state: { issues: ["Missing citations"] } },
      { status: "succeeded", replan_count: 2, verification_state: { issues: ["Missing citations"] } },
      { status: "succeeded", replan_count: 0, verification_state: { issues: ["Missing citations"] } },
      { status: "succeeded", replan_count: 0, verification_state: { issues: [] } },
    ]);

    expect(report.runs).toBe(5);
    expect(report.high_replan_runs).toBe(3);
    expect(report.patterns.find((pattern) => pattern.kind === "verification")?.count).toBeGreaterThanOrEqual(4);
    expect(report.recommendations.some((item) => item.area === "success_criteria")).toBe(true);
    expect(report.recommendations.some((item) => item.area === "planning")).toBe(true);
  });

  it("detects repeated tool and timeout failures without inventing recommendations from one-off errors", () => {
    const recurring = analyseAgentImprovement([
      { status: "failed", error: "Browser tool connection failed" },
      { status: "failed", error: "Browser tool connection failed" },
      { status: "failed", error: "Run timed out" },
      { status: "failed", error: "Run timed out" },
      { status: "succeeded" },
    ]);
    expect(recurring.recommendations.some((item) => item.area === "tools")).toBe(true);
    expect(recurring.recommendations.some((item) => item.area === "reliability")).toBe(true);

    const oneOff = analyseAgentImprovement([{ status: "failed", error: "Provider rate limit" }]);
    expect(oneOff.recommendations.some((item) => item.area === "model")).toBe(false);
  });

  it("ignores non-terminal work", () => {
    const report = analyseAgentImprovement([
      { status: "running", error: "tool failed", replan_count: 9, verification_state: { issues: ["bad"] } },
      { status: "queued", error: "timeout" },
    ]);
    expect(report.runs).toBe(0);
    expect(report.patterns).toEqual([]);
    expect(report.recommendations).toEqual([]);
  });
});
