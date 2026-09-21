import { describe, expect, it } from "vitest";
import { resolveAgentRuntimeSnapshot } from "../runtime-snapshot";

describe("authenticated agent runtime snapshot", () => {
  const agent = { id: "agent-1", name: "Blackstar agent" };
  const task = { id: "task-1", status: "succeeded" };

  it("returns persisted agent configuration and task history", () => {
    expect(resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: [task], error: null },
    )).toEqual({ agent, tasks: [task] });
  });

  it("reports a genuinely empty history only after a successful query", () => {
    expect(resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: [], error: null },
    ).tasks).toEqual([]);
  });

  it("does not present failed or indeterminate database reads as empty history", () => {
    expect(() => resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: null, error: { message: "schema cache missing" } },
    )).toThrow("Could not load agent task history.");
    expect(() => resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: null, error: null },
    )).toThrow("Could not load agent task history.");
  });

  it("distinguishes inaccessible agents from configuration read errors", () => {
    expect(() => resolveAgentRuntimeSnapshot(
      { data: null, error: null }, { data: [], error: null },
    )).toThrow("Agent not found or you do not have access to it.");
    expect(() => resolveAgentRuntimeSnapshot(
      { data: null, error: { message: "schema cache missing" } }, { data: [], error: null },
    )).toThrow("Could not load agent configuration.");
  });
});
