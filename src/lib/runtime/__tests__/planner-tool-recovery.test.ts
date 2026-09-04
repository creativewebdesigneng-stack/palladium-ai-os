import { describe, expect, it } from "vitest";
import { createInitialPlan } from "@/lib/agents/agent-planner";
import { classifyPlannedToolFailure, isAmbiguousExternalFailure, isApprovalWait } from "../planner-tool-recovery.server";

const plan = () => createInitialPlan({ objective: "Research suppliers" });
const grant = (requiresApproval = false) => ({ slug: "web_search", requiresApproval, allowedDomains: [], spendCap: null });

describe("planned tool failure recovery", () => {
  it("uses Blackstar self-healing to authorize bounded safe replanning", () => {
    const result = classifyPlannedToolFailure({ plan: plan(), tool: "web_search", ok: false, output: { error: "upstream unavailable" }, grant: grant(false) as any });
    expect(result.shouldReplan).toBe(true);
    expect(result.healing).toMatchObject({ action: "retry", automatic: true });
    expect(result.decision?.next_action).toBe("replan");
    expect(result.decision?.issues[0]).toContain("web_search failed");
  });

  it("does not treat an approval wait as a replayable failure", () => {
    expect(isApprovalWait({ status: "awaiting_approval", approval_request_id: "req-1" })).toBe(true);
    const result = classifyPlannedToolFailure({ plan: plan(), tool: "web_search", ok: false, output: { status: "awaiting_approval", approval_request_id: "req-1" }, grant: grant(false) as any });
    expect(result.shouldReplan).toBe(false);
    expect(result.healing.action).toBe("pause_for_approval");
  });

  it("fails closed for unknown or write-capable tools", () => {
    const result = classifyPlannedToolFailure({ plan: plan(), tool: "connected_service", ok: false, output: { error: "request failed" }, grant: { ...grant(false), slug: "connected_service" } as any });
    expect(result.shouldReplan).toBe(false);
    expect(result.reason).toBe("tool_not_safe_for_automatic_replan");
    expect(result.healing.action).toBe("fail_closed");
  });

  it("pauses approval-gated reads", () => {
    const result = classifyPlannedToolFailure({ plan: plan(), tool: "web_search", ok: false, output: { error: "failed" }, grant: grant(true) as any });
    expect(result.shouldReplan).toBe(false);
    expect(result.reason).toBe("tool_not_approval_free");
    expect(result.healing.action).toBe("pause_for_approval");
  });

  it("treats ambiguous/post-dispatch failures as mutation-sensitive", () => {
    expect(isAmbiguousExternalFailure({ failure_phase: "post_dispatch" })).toBe(true);
    expect(isAmbiguousExternalFailure({ safe_to_failover: false })).toBe(true);
    const result = classifyPlannedToolFailure({ plan: plan(), tool: "web_search", ok: false, output: { failure_phase: "post_dispatch", message: "timeout" }, grant: grant(false) as any });
    expect(result.shouldReplan).toBe(false);
    expect(result.reason).toBe("ambiguous_external_failure");
    expect(result.healing.action).toBe("pause_for_approval");
  });

  it("respects the planner replan budget through self-healing policy", () => {
    const exhausted = { ...plan(), replan_count: 3, max_replans: 3 };
    const result = classifyPlannedToolFailure({ plan: exhausted, tool: "web_search", ok: false, output: { error: "failed" }, grant: grant(false) as any });
    expect(result.shouldReplan).toBe(false);
    expect(result.reason).toBe("replan_budget_exhausted");
    expect(result.healing.action).toBe("fail_closed");
  });
});
