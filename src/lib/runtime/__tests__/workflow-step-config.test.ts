import { describe, expect, it } from "vitest";
import {
  SUPPORTED_WORKFLOW_STEP_KINDS,
  assertSupportedWorkflowStepKind,
  normaliseWorkflowStepConfig,
} from "../workflow-step-config";

describe("workflow executable step contract", () => {
  it("exposes only step kinds implemented by the runtime", () => {
    expect(SUPPORTED_WORKFLOW_STEP_KINDS).toEqual([
      "agent",
      "approval",
      "delay",
      "notification",
    ]);
  });

  it("rejects presentation-only or future node kinds before persistence", () => {
    for (const kind of ["condition", "action", "api", "database", "loop", "webhook"]) {
      expect(() => assertSupportedWorkflowStepKind(kind, "Imported step")).toThrow(
        /unsupported kind/i,
      );
    }
  });

  it("normalises case and validates bounded delay configuration", () => {
    expect(assertSupportedWorkflowStepKind(" Notification ")).toBe("notification");
    expect(normaliseWorkflowStepConfig("delay", { duration_ms: 2500 })).toEqual({
      duration_ms: 2500,
    });
    expect(() => normaliseWorkflowStepConfig("delay", { duration_ms: 300001 })).toThrow(
      /duration_ms/i,
    );
  });

  it("bounds arbitrary JSON configuration instead of persisting untrusted shapes", () => {
    const long = "x".repeat(3000);
    const config = normaliseWorkflowStepConfig("notification", {
      title: long,
      nested: { enabled: true },
      ignored: ["a", { secret: "not copied" }, "b"],
    });
    expect(String(config["title"])).toHaveLength(2000);
    expect(config["nested"]).toEqual({ enabled: true });
    expect(config["ignored"]).toEqual(["a", "b"]);
  });
});
