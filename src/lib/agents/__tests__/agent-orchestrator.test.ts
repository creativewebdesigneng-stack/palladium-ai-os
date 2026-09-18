import { describe, expect, it } from "vitest";
import {
  attachSelectionAttribution,
  buildAgentSelectionAttribution,
  fallbackOrchestratorPlan,
  normaliseOrchestratorPlan,
  renderCandidateCatalogue,
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

  it("uses evidence-backed registry skills and trust as bounded routing signals", () => {
    const verified: OrchestratorCandidate = {
      ...coder,
      id: "verified-commerce",
      name: "Verified Commerce Agent",
      trust_score: 0.94,
      operating_profile: {
        ...coder.operating_profile,
        skills_registry: {
          version: 1,
          skills: [
            {
              name: "shopify inventory automation",
              proficiency: 0.95,
              learnable: true,
              connectors: ["Shopify"],
              evidence: [{ kind: "verified_task", verified: true, score: 0.97 }],
            },
          ],
          connectors: ["Shopify", "MCP"],
          permissions: ["inventory:read"],
          models: ["blackstar:astra"],
        },
      },
    };
    const generic: OrchestratorCandidate = {
      ...coder,
      id: "generic-commerce",
      name: "Generic Commerce Agent",
      trust_score: 0.1,
    };

    expect(shortlistAgents("automate shopify inventory", [generic, verified])[0]?.id).toBe("verified-commerce");
    const catalogue = renderCandidateCatalogue([verified]);
    expect(catalogue).toContain("shopify inventory automation [verified]");
    expect(catalogue).toContain("Trust score: 94%");
  });

  it("builds selection attribution from the exact bounded pre-ranking score", () => {
    const candidate: OrchestratorCandidate = {
      ...research,
      trust_score: 0.8,
      performance: {
        agent_id: "research",
        runs: 8,
        successes: 7,
        failures: 1,
        verified_runs: 8,
        success_rate: 0.875,
        average_verifier_score: 0.93,
        average_replans: 0.25,
        average_duration_ms: 1200,
        performance_score: 0.82,
      },
      similar_performance: {
        agent_id: "research",
        goal: "research competitors",
        runs: 4,
        successes: 4,
        failures: 0,
        verified_runs: 4,
        success_rate: 1,
        average_verifier_score: 0.95,
        average_replans: 0,
        average_duration_ms: 1100,
        performance_score: 0.72,
        similarity_runs: 4,
        average_similarity: 0.75,
        similarity_score: 0.54,
      },
      operating_profile: {
        ...research.operating_profile,
        skills_registry: {
          version: 1,
          skills: [{
            name: "competitor analysis",
            proficiency: 0.9,
            learnable: true,
            tools: ["web_search"],
            connectors: ["Research MCP"],
            certifications: [{
              name: "Blackstar Verified — competitor analysis",
              issuer: "Blackstar runtime verifier",
              status: "verified",
            }],
            evidence: [{ kind: "verified_task", verified: true, score: 0.96, reference: "task:one" }],
          }],
          tools: ["web_search"],
          connectors: ["Research MCP"],
          previous_experience: ["Competitor research for UK retail launches"],
          models: ["blackstar:astra"],
        },
      },
    };

    const attribution = buildAgentSelectionAttribution("perform competitor analysis with web_search evidence", candidate);

    expect(attribution.score).toBe(scoreAgentForGoal("perform competitor analysis with web_search evidence", candidate));
    expect(attribution.agent_name).toBe("Market Intelligence Agent");
    expect(attribution.matched_skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "competitor analysis", verified: true, certified: true }),
    ]));
    expect(attribution.matched_tools).toContain("web_search");
    expect(attribution.score_breakdown.trust).toBeGreaterThan(0);
    expect(attribution.score_breakdown.performance).toBeGreaterThan(0);
    expect(attribution.score_breakdown.similar_performance).toBeGreaterThan(0);
  });

  it("never lets planner-provided attribution override deterministic selection evidence", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Research competitors",
      candidates: [research],
      value: {
        selection_audit: {
          scoring_method: "planner_claim",
          ranked_candidates: [{ agent_id: "unknown", score: 999999 }],
        },
        assignments: [{
          id: "research-step",
          title: "Research",
          objective: "Find competitor evidence",
          agent_id: "research",
          selection_attribution: { score: 999999, agent_name: "spoofed" },
        }],
      },
    });

    expect(plan.assignments[0]?.selection_attribution).toBeUndefined();
    expect(plan.selection_audit).toBeUndefined();

    const attributed = attachSelectionAttribution(plan, [research]);
    expect(attributed.assignments[0]?.selection_attribution?.agent_name).toBe(research.name);
    expect(attributed.assignments[0]?.selection_attribution?.score).toBe(scoreAgentForGoal(plan.goal, research));
    expect(attributed.selection_audit?.scoring_method).toBe("bounded_pre_rank_v1");
    expect(attributed.selection_audit?.ranked_candidates[0]).toEqual(expect.objectContaining({
      agent_id: "research",
      rank: 1,
      selected: true,
    }));
  });

  it("records ranked alternatives and score gaps without changing assignment authority", () => {
    const plan = normaliseOrchestratorPlan({
      goal: "Research competitors with web evidence",
      candidates: [coder, research],
      value: {
        assignments: [{
          id: "research-step",
          title: "Research",
          objective: "Find competitor evidence",
          agent_id: "research",
        }],
      },
    });

    const attributed = attachSelectionAttribution(plan, [coder, research]);
    const audit = attributed.selection_audit?.ranked_candidates ?? [];

    expect(audit).toHaveLength(2);
    expect(audit[0]).toEqual(expect.objectContaining({
      rank: 1,
      agent_id: "research",
      selected: true,
      score_delta_from_top: 0,
    }));
    expect(audit[1]?.rank).toBe(2);
    expect(audit[1]?.selected).toBe(false);
    expect(audit[1]?.score_delta_from_top).toBeGreaterThanOrEqual(0);
    expect(attributed.assignments[0]?.agent_id).toBe("research");
  });

  it("does not present verifier-confirmed failure evidence as positive verification", () => {
    const failureOnly: OrchestratorCandidate = {
      ...research,
      operating_profile: {
        ...research.operating_profile,
        skills_registry: {
          version: 1,
          skills: [{
            name: "competitor analysis",
            proficiency: 0.6,
            learnable: true,
            evidence: [{
              kind: "verified_failure",
              verified: true,
              score: 0.3,
              reference: "task:failed:verification-failure",
            }],
          }],
        },
      },
    };

    const attribution = buildAgentSelectionAttribution("competitor analysis", failureOnly);
    expect(attribution.matched_skills[0]?.verified).toBe(false);
    expect(renderCandidateCatalogue([failureOnly])).not.toContain("competitor analysis [verified]");
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
    expect(plan.selection_audit?.ranked_candidates).toEqual([
      expect.objectContaining({ rank: 1, agent_id: "research", selected: true, score_delta_from_top: 0 }),
    ]);
  });
});
