import { describe, expect, it } from "vitest";
import {
  canBatchInParallel,
  compactToolResultForModel,
  RunLoopGuard,
  SAFE_PARALLEL_READ_TOOLS,
} from "../atomic-loop-guard.server";
import type { ToolGrant } from "../tools.server";

function grants(entries: Array<[string, boolean]>): Map<string, ToolGrant> {
  return new Map(
    entries.map(([slug, requiresApproval]) => [
      slug,
      { slug, requiresApproval, allowedDomains: [], spendCap: null } as ToolGrant,
    ]),
  );
}

const call = (name: string, args: Record<string, unknown> = {}) => ({
  id: `c-${name}`,
  name,
  arguments: args,
});

describe("conservative parallel read batching", () => {
  it("batches two granted, approval-free safe reads", () => {
    expect(
      canBatchInParallel(
        [call("web_search", { q: "a" }), call("current_time")],
        grants([
          ["web_search", false],
          ["current_time", false],
        ]),
      ),
    ).toBe(true);
  });

  it("stays sequential when one call is sensitive or unknown", () => {
    expect(
      canBatchInParallel(
        [call("web_search"), call("integration_action", { provider: "slack" })],
        grants([
          ["web_search", false],
          ["integration_action", false],
        ]),
      ),
    ).toBe(false);
    expect(
      canBatchInParallel(
        [call("web_search"), call("future_unknown_tool")],
        grants([
          ["web_search", false],
          ["future_unknown_tool", false],
        ]),
      ),
    ).toBe(false);
  });

  it("stays sequential when a grant requires approval or is missing", () => {
    expect(
      canBatchInParallel(
        [call("web_search"), call("web_fetch")],
        grants([
          ["web_search", false],
          ["web_fetch", true],
        ]),
      ),
    ).toBe(false);
    expect(
      canBatchInParallel([call("web_search"), call("web_fetch")], grants([["web_search", false]])),
    ).toBe(false);
  });

  it("never batches write-capable tools", () => {
    for (const name of [
      "connected_service",
      "nango_action",
      "browser",
      "shopping_search",
      "prepare_purchase",
      "send_email",
      "code_exec",
    ]) {
      expect(SAFE_PARALLEL_READ_TOOLS).not.toContain(name);
    }
  });
});

describe("repeated / no-progress detection", () => {
  it("warns on the third identical request and not on changed args", () => {
    const guard = new RunLoopGuard();
    const same = call("web_search", { q: "chairs" });
    expect(guard.inspect(same).action).toBe("allow");
    guard.record(same, { results: 1 });
    expect(guard.inspect(same).action).toBe("allow");
    guard.record(same, { results: 2 });
    const third = guard.inspect(same);
    expect(third.action).toBe("warn");
    expect(third.action === "warn" && third.notice).toContain("already made this exact");

    const changed = call("web_search", { q: "desks" });
    expect(guard.inspect(changed).action).toBe("allow");
  });

  it("vetoes a repeated no-progress call before execution", () => {
    const guard = new RunLoopGuard();
    const same = call("database_query", { sql: "select 1" });
    for (let i = 0; i < 4; i += 1) {
      guard.inspect(same);
      guard.record(same, { rows: [] });
    }
    const decision = guard.inspect(same);
    expect(decision.action).toBe("veto");
    if (decision.action === "veto") {
      expect(decision.output["error"]).toBe("repeated_no_progress_blocked");
    }
  });

  it("does not veto when outcomes keep changing", () => {
    const guard = new RunLoopGuard();
    const same = call("web_search", { q: "news" });
    for (let i = 0; i < 5; i += 1) {
      guard.record(same, { results: i });
    }
    expect(guard.inspect(same).action).toBe("warn");
  });
});

describe("model-context compaction", () => {
  it("leaves short results untouched", () => {
    const output = { ok: true, value: 42 };
    expect(compactToolResultForModel(output)).toBe(JSON.stringify(output));
  });

  it("keeps head and tail with a compression marker", () => {
    const output = { head: "H".repeat(9_000), tail_error: "RATE_LIMITED" };
    const compacted = compactToolResultForModel(output);
    const raw = JSON.stringify(output);
    expect(compacted.length).toBeLessThan(raw.length);
    expect(compacted).toContain("PALLADIUM_TRUNCATED");
    expect(compacted).toContain(`${raw.length} characters`);
    expect(compacted.startsWith('{"head":"HHH')).toBe(true);
    expect(compacted).toContain("RATE_LIMITED");
  });
});
