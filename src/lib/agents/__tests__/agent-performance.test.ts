import { describe, expect, it } from "vitest";
import { performanceSelectionBonus, summariseAgentPerformance } from "../agent-performance";

describe("agent performance intelligence", () => {
  it("summarises verified completion quality and re-plan efficiency", () => {
    const tasks = Array.from({ length: 10 }, (_, index) => ({
      agent_id: "agent-a",
      status: index < 9 ? "succeeded" : "failed",
      verification_state: { score: index < 9 ? 0.94 : 0.2 },
      replan_count: index < 8 ? 0 : 1,
      duration_ms: 1200 + index * 10,
    }));
    const snapshot = summariseAgentPerformance("agent-a", tasks);
    expect(snapshot.runs).toBe(10);
    expect(snapshot.success_rate).toBeCloseTo(0.9);
    expect(snapshot.average_verifier_score).toBeGreaterThan(0.8);
    expect(snapshot.average_replans).toBeCloseTo(0.2);
    expect(snapshot.performance_score).toBeGreaterThan(0.75);
    expect(performanceSelectionBonus(snapshot)).toBeGreaterThanOrEqual(9);
  });

  it("does not let tiny samples overpower skill matching", () => {
    const snapshot = summariseAgentPerformance("agent-a", [
      {
        agent_id: "agent-a",
        status: "succeeded",
        verification_state: { score: 1 },
        replan_count: 0,
      },
    ]);
    expect(snapshot.performance_score).toBeLessThanOrEqual(0.1);
    expect(performanceSelectionBonus(snapshot)).toBe(0);
  });

  it("ignores non-terminal tasks and isolates stats by agent", () => {
    const snapshot = summariseAgentPerformance("agent-a", [
      { agent_id: "agent-a", status: "running", verification_state: { score: 1 } },
      { agent_id: "agent-b", status: "succeeded", verification_state: { score: 1 } },
      { agent_id: "agent-a", status: "completed", verification_state: { score: 0.8 } },
      { agent_id: "agent-a", status: "cancelled", verification_state: null },
    ]);
    expect(snapshot.runs).toBe(2);
    expect(snapshot.successes).toBe(1);
    expect(snapshot.failures).toBe(1);
    expect(snapshot.verified_runs).toBe(1);
  });
});
