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

  it("reports a genuinely empty history only after a successful task query", () => {
    expect(resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: [], error: null },
    ).tasks).toEqual([]);
  });

  it("never reports a failed task-history query as empty success", () => {
    expect(() => resolveAgentRuntimeSnapshot(
      { data: agent, error: null }, { data: null, error: { message: "schema cache missing" } },
    )).toThrow("Could not load agent task history.");
  });

  it("distinguishes an inaccessible agent from a database read failure", () => {
    expect(() => resolveAgentRuntimeSnapshot(
      { data: null, error: null }, { data: [], error: null },
    )).toThrow("Agent not found or you do not have access to it.");
    expect(() => resolveAgentRuntimeSnapshot(
      { data: null, error: { message: "schema cache missing" } }, { data: [], error: null },
    )).toThrow("Could not load agent configuration.");
  });
});
