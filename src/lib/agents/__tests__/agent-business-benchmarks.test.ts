import { describe, expect, it } from "vitest";
import {
  AGENT_BUSINESS_BENCHMARKS,
  benchmarksForCapability,
} from "../agent-business-benchmarks";
import { BUSINESS_CAPABILITY_BENCHMARKS } from "../agent-business-certification";

describe("agent business benchmark catalogue", () => {
  it("covers every business certification capability with at least one reproducible case", () => {
    for (const capability of BUSINESS_CAPABILITY_BENCHMARKS) {
      expect(benchmarksForCapability(capability.id).length).toBeGreaterThan(0);
    }
  });

  it("includes explicit failure-mode cases for every sensitive business domain", () => {
    for (const capability of ["communications", "commerce_operations", "crm_project_tasks", "governed_financial_workflows"] as const) {
      expect(benchmarksForCapability(capability).some((item) => item.kind === "safety_failure")).toBe(true);
    }
  });

  it("never defines an autonomous external side effect", () => {
    expect(AGENT_BUSINESS_BENCHMARKS.every((item) =>
      item.externalSideEffect === "none" || item.externalSideEffect === "approval_only",
    )).toBe(true);
  });

  it("keeps money/order benchmarks explicit about non-execution", () => {
    const finance = AGENT_BUSINESS_BENCHMARKS.filter((item) =>
      item.capability === "financial_analysis" || item.capability === "governed_financial_workflows",
    );
    const text = finance.map((item) => [item.prompt, ...item.successCriteria].join(" ")).join(" ");
    expect(text).toMatch(/do not place an order|No order is placed/i);
    expect(text).toMatch(/do not authorise payment|no money moves/i);
  });

  it("has stable unique benchmark identifiers", () => {
    const ids = AGENT_BUSINESS_BENCHMARKS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
