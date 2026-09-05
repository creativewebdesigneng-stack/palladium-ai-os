import { describe, expect, it } from "vitest";
import {
  assessGeneralIntelligenceGoal,
  normaliseGeneralIntelligenceGoal,
  renderGeneralIntelligenceControlPrompt,
} from "../general-intelligence-kernel";
import type { OrchestratorCandidate } from "../agent-orchestrator";

const research: OrchestratorCandidate = {
  id: "research",
  name: "Research Agent",
  category: "research",
  allowed_tools: ["web_search"],
  operating_profile: { role: "Researcher", skills: ["research", "evidence"] },
};

const engineer: OrchestratorCandidate = {
  id: "engineer",
  name: "Engineering Agent",
  category: "engineering",
  allowed_tools: ["github"],
  operating_profile: { role: "Engineer", skills: ["code", "testing", "deployment"] },
};

describe("Blackstar general intelligence kernel", () => {
  it("infers cross-domain goals and delegates across authorised specialists", () => {
    const goal = normaliseGeneralIntelligenceGoal({
      objective: "Research competitors and build software from the evidence",
    });
    const assessment = assessGeneralIntelligenceGoal({
      goal,
      candidates: [research, engineer],
      confidence: 0.9,
      novelty: 0.2,
      ambiguity: 0.1,
      risk: 0.1,
    });
    expect(goal.domains).toEqual(expect.arrayContaining(["research", "engineering"]));
    expect(assessment.mode).toBe("delegate");
    expect(assessment.selected_agent_ids).toEqual(expect.arrayContaining(["research", "engineer"]));
    expect(assessment.requires_verification).toBe(true);
  });

  it("routes novel or ambiguous objectives toward collective intelligence", () => {
    const goal = normaliseGeneralIntelligenceGoal({ objective: "Invent a new market strategy" });
    const assessment = assessGeneralIntelligenceGoal({
      goal,
      candidates: [research],
      confidence: 0.7,
      novelty: 0.9,
      ambiguity: 0.7,
      risk: 0.2,
    });
    expect(assessment.mode).toBe("collective");
    expect(assessment.collective_intelligence_recommended).toBe(true);
  });

  it("escalates high-risk objectives and requires approval", () => {
    const goal = normaliseGeneralIntelligenceGoal({ objective: "Operate a production workflow" });
    const assessment = assessGeneralIntelligenceGoal({
      goal,
      candidates: [research],
      confidence: 0.9,
      risk: 0.9,
    });
    expect(assessment.mode).toBe("escalate");
    expect(assessment.requires_approval).toBe(true);
  });

  it("escalates rather than inventing capability when no authorised agent exists", () => {
    const goal = normaliseGeneralIntelligenceGoal({ objective: "Complete an objective" });
    const assessment = assessGeneralIntelligenceGoal({ goal, candidates: [] });
    expect(assessment.mode).toBe("escalate");
    expect(assessment.selected_agent_ids).toEqual([]);
    expect(assessment.reasons.join(" ")).toMatch(/No authorised candidate capability/i);
  });

  it("renders an explicit bounded control contract", () => {
    const goal = normaliseGeneralIntelligenceGoal({ objective: "Research a market" });
    const assessment = assessGeneralIntelligenceGoal({ goal, candidates: [research] });
    const prompt = renderGeneralIntelligenceControlPrompt(assessment);
    expect(prompt).toContain("BLACKSTAR GENERAL INTELLIGENCE CONTROL");
    expect(prompt).toMatch(/Never invent permissions/i);
    expect(prompt).toMatch(/Verification required: yes/i);
  });
});
