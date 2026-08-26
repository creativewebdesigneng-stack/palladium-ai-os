import { describe, expect, it } from "vitest";
import {
  ToolLoopGuard,
  compactToolResult,
  shouldParalleliseToolBatch,
  type RuntimeToolCall,
} from "../atomic-loop-guard.server";
import type { ToolGrant } from "../tools.server";

const grant = (slug: string, requiresApproval = false): ToolGrant => ({
  slug,
  requiresApproval,
  allowedDomains: [],
  spendCap: null,
});

const call = (id: string, name: string, args: Record<string, unknown> = {}): RuntimeToolCall => ({
  id,
  name,
  arguments: args,
});

describe("Atomic-inspired Palladium agent loop guard", () => {
  it("parallelises only all-safe read batches", () => {
    const calls = [call("1", "web_search", { query: "a" }), call("2", "calculator", { expression: "2+2" })];
    const grants = new Map([
      ["web_search", grant("web_search")],
      ["calculator", grant("calculator")],
    ]);
    expect(shouldParalleliseToolBatch(calls, grants)).toBe(true);
  });

  it("keeps mixed or approval-sensitive batches sequential", () => {
    const calls = [call("1", "web_search", { query: "a" }), call("2", "email_send", { to: "x@example.com" })];
    const grants = new Map([
      ["web_search", grant("web_search")],
      ["email_send", grant("email_send", true)],
    ]);
    expect(shouldParalleliseToolBatch(calls, grants)).toBe(false);
  });

  it("warns on repeated identical calls and escalates on identical no-progress outcomes", () => {
    const guard = new ToolLoopGuard();
    const repeated = call("1", "web_search", { query: "same" });
    const output = { results: [] };

    for (let i = 0; i < 2; i += 1) {
      expect(guard.check(repeated).level).toBe("ok");
      guard.recordCall(repeated);
      guard.recordOutcome(repeated, output);
    }

    expect(guard.check(repeated).level).toBe("warn");
    for (let i = 0; i < 2; i += 1) {
      guard.recordCall(repeated);
      guard.recordOutcome(repeated, output);
    }
    expect(guard.check(repeated).level).toBe("critical");
  });

  it("does not call changed arguments a repeat", () => {
    const guard = new ToolLoopGuard();
    const first = call("1", "web_search", { query: "one" });
    guard.recordCall(first);
    guard.recordOutcome(first, { results: [] });
    expect(guard.check(call("2", "web_search", { query: "two" })).level).toBe("ok");
  });

  it("keeps short results intact and compresses oversized results", () => {
    expect(compactToolResult({ ok: true })).toBe('{"ok":true}');
    const compacted = compactToolResult({ text: "x".repeat(10_000) }, 1_000);
    expect(compacted.length).toBeLessThanOrEqual(1_050);
    expect(compacted).toContain("tool result compressed");
  });
});
