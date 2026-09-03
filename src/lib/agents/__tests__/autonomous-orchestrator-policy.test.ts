import { describe, expect, it } from "vitest";
import { fallbackOrchestratorPlan, normaliseOrchestratorPlan } from "../agent-orchestrator";

const candidates = Array.from({ length: 6 }, (_, index) => ({
  id: `agent-${index + 1}`,
  name: `Agent ${index + 1}`,
}));

const rawAssignments = candidates.map((candidate, index) => ({
  id: `step-${index + 1}`,
  title: `Step ${index + 1}`,
  objective: `Complete specialist objective ${index + 1}`,
  agent_id: candidate.id,
  depends_on: index === 0 ? [] : [`step-${index}`],
  success_criteria: ["Done"],
  requires_approval: false,
}));

describe("Autonomous OS orchestrator policy", () => {
  it("caps persisted assignments at the goal specialist limit and removes trimmed dependencies", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Complete the mission",
      value: { summary: "Plan", assignments: rawAssignments },
      candidates,
      maxAssignments: 3,
    });
    expect(plan.assignments).toHaveLength(3);
    expect(plan.assignments.map((assignment) => assignment.id)).toEqual(["step-1", "step-2", "step-3"]);
    expect(plan.assignments[2]?.depends_on).toEqual(["step-2"]);
  });

  it("forces every assignment through approval in assisted autonomy", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Complete the mission",
      value: { assignments: rawAssignments.slice(0, 3) },
      candidates,
      maxAssignments: 3,
      forceApproval: true,
    });
    expect(plan.assignments.every((assignment) => assignment.requires_approval)).toBe(true);
  });

  it("forces approval on fallback plans too", () => {
    expect(fallbackOrchestratorPlan("Complete the mission", candidates[0]!, true).assignments[0]?.requires_approval).toBe(true);
  });
});
