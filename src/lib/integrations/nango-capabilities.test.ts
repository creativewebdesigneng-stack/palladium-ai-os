import { describe, expect, it } from "vitest";
import {
  assertSafeNangoActionInput,
  classifyNangoActionRisk,
  sanitizeNangoActionOutput,
} from "./nango-capabilities.server";

describe("dynamic Nango agent capability safety", () => {
  it("allows explicit read actions to run autonomously", () => {
    expect(classifyNangoActionRisk("list-repositories", "List repositories")).toBe("low");
    expect(classifyNangoActionRisk("searchContacts", "Find matching contacts")).toBe("low");
  });

  it("routes writes and destructive actions to the correct approval risk", () => {
    expect(classifyNangoActionRisk("create-issue", "Create an issue")).toBe("medium");
    expect(classifyNangoActionRisk("delete-project", "Delete a project permanently")).toBe("high");
    expect(classifyNangoActionRisk("custom-operation", "Provider-specific operation")).toBe(
      "medium",
    );
  });

  it("rejects credentials anywhere in model-supplied action input", () => {
    expect(() =>
      assertSafeNangoActionInput({ repository: "owner/repo", nested: { accessToken: "no" } }),
    ).toThrow("Credentials cannot be supplied by an agent");
    expect(() => assertSafeNangoActionInput({ authorization: "Bearer no" })).toThrow(
      "Credentials cannot be supplied by an agent",
    );
  });

  it("accepts bounded ordinary action input", () => {
    expect(() =>
      assertSafeNangoActionInput({ repository: "owner/repo", filters: { state: "open" } }),
    ).not.toThrow();
  });

  it("redacts provider credentials before results reach the model or audit record", () => {
    expect(
      sanitizeNangoActionOutput({ id: "1", accessToken: "no", nested: { api_key: "no" } }),
    ).toEqual({ id: "1", accessToken: "[redacted]", nested: { api_key: "[redacted]" } });
  });
});
