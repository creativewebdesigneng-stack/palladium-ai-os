import { describe, expect, it, vi } from "vitest";
import { describeError, persistedAgentId, singleFlight } from "../agent-create-submit";

describe("agent create submit guards", () => {
  it("collapses overlapping submits into a single mutation", async () => {
    const fn = vi.fn(async () => ({ id: "a1" }));
    const submit = singleFlight(fn);
    const results = await Promise.all([submit(), submit(), submit()]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.id === "a1")).toBe(true);
  });

  it("allows a new submit after the previous one settles", async () => {
    const fn = vi.fn(async () => ({ id: "a1" }));
    const submit = singleFlight(fn);
    await submit();
    expect(submit.isPending()).toBe(false);
    await submit();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry automatically when the mutation rejects", async () => {
    const fn = vi.fn(async () => {
      throw new Error("insert failed");
    });
    const submit = singleFlight(fn);
    await expect(submit()).rejects.toThrow("insert failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reports no persisted id when the server confirms nothing", () => {
    expect(persistedAgentId(null)).toBeNull();
    expect(persistedAgentId({})).toBeNull();
    expect(persistedAgentId({ id: "" })).toBeNull();
    expect(persistedAgentId({ id: "agent-1" })).toBe("agent-1");
    expect(persistedAgentId({ agent: { id: "agent-2" } })).toBe("agent-2");
  });

  it("never renders a structured error as [object Object]", () => {
    expect(describeError({ message: "row-level security" })).toBe("row-level security");
    expect(describeError({ code: "42501" })).toContain("42501");
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError(undefined, "fallback")).toBe("fallback");
    expect(describeError({ code: "42501" })).not.toContain("[object Object]");
  });
});
