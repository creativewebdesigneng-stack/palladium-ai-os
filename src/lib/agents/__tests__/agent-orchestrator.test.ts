import { describe, expect, it } from "vitest";
import {
  fallbackOrchestratorPlan,
  normaliseOrchestratorPlan,
  scoreAgentForGoal,
  shortlistAgents,
  type OrchestratorCandidate,
} from "../agent-orchestrator";

const research: OrchestratorCandidate = {
  id: "research",
  name: "Market Intelligence Agent",
  category: "research",
  allowed_tools: ["web_search", "browser"],
  operating_profile: {
    role: "Market researcher",
    objective: "Research competitors and customer signals",
    skills: ["research", "competitor analysis", "evidence verification"],
    success_criteria: ["Claims cite evidence"],
  },
};

const coder: OrchestratorCandidate = {
  id: "coder",
  name: "Developer Agent",
  category: "engineering",
  allowed_tools: ["github"],
  operating_profile: {
    role: "Software engineer",
    objective: "Implement and review code changes",
    skills: ["typescript", "testing", "github"],
  },
};

describe("Palladium Orchestrator", () => {
  it("pre-ranks relevant specialists deterministically", () => {
    expect(scoreAgentForGoal("research competitors with web evidence", research)).toBeGreaterThan(
      scoreAgentForGoal("research competitors with web evidence", coder),
    );
    expect(shortlistAgents("research competitors", [coder, research])[0]?.id).toBe("research");
  });

  it("uses verified performance as a bounded tie-breaker between similarly qualified specialists", () => {
    const reliable: OrchestratorCandidate = {
      ...research,
      id: "reliable",
      name: "Reliable Researcher",
      performance: {
        agent_id: "reliable",
        runs: 10,
        successes: 10,
        failures: 0,
        verified_runs: 10,
        success_rate: 1,
        average_verifier_score: 0.96,
        average_replans: 0.1,
        average_duration_ms: 1500,
        performance_score: 0.96,
      },
    };
    const unproven: OrchestratorCandidate = { ...research, id: "unproven", name: "Unproven Researcher" };
    expect(shortlistAgents("research competitors", [unproven, reliable])[0]?.id).toBe("reliable");
  });

  it("rejects assignments to agents outside the authorised shortlist", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Research and build a report",
      candidates: [research, coder],
      value: {
        assignments: [
          { id: "a", title: "Research", objective: "Find evidence", agent_id: "research" },
          { id: "b", title: "Exfiltrate", objective: "Do something else", agent_id: "unknown" },
        ],
      },
    });
    expect(plan.assignments.map((item) => item.agent_id)).toEqual(["research"]);
  });

  it("preserves only declared valid dependencies", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Research then implement",
      candidates: [research, coder],
      value: {
        assignments: [
          { id: "research-step", title: "Research", objective: "Find evidence", agent_id: "research" },
          {
            id: "build-step",
            title: "Build",
            objective: "Use the research",
            agent_id: "coder",
            depends_on: ["research-step", "missing", "build-step"],
          },
        ],
      },
    });
    expect(plan.assignments[1]?.depends_on).toEqual(["research-step"]);
  });

  it("rejects circular delegation graphs", () => {
    expect(() =>
      normaliseOrchestratorPlan({
        goal: "Do work",
        candidates: [research, coder],
        value: {
          assignments: [
            { id: "a", title: "A", objective: "A", agent_id: "research", depends_on: ["b"] },
            { id: "b", title: "B", objective: "B", agent_id: "coder", depends_on: ["a"] },
          ],
        },
      }),
    ).toThrow(/circular/i);
  });

  it("creates a deterministic one-agent fallback", () => {
    const plan = fallbackOrchestratorPlan("Research competitors", research);
    expect(plan.assignments).toHaveLength(1);
    expect(plan.assignments[0]?.agent_id).toBe("research");
    expect(plan.assignments[0]?.success_criteria).toContain("Claims cite evidence");
  });
});
