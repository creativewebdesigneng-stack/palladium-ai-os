import { describe, expect, it } from "vitest";
import { createInitialPlan, normaliseVerificationDecision } from "@/lib/agents/agent-planner";
import { captureVerifiedAgentSkillLearning } from "../agent-skill-learning.server";
import { createFakeSupabase } from "./fake-supabase";

function verifiedTask(id = "task-1") {
  return {
    id,
    agent_id: "agent-1",
    input: "Research the target market",
    output_text: "Delivered a verified market research brief with sourced evidence.",
    planner_state: createInitialPlan({
      objective: "Research the target market",
      profile: { quality_threshold: 0.8, verification_required: true },
    }),
    verification_state: normaliseVerificationDecision({
      passed: true,
      score: 0.95,
      evidence: ["Market research sources were verified"],
      next_action: "complete",
    }),
    status: "succeeded",
  };
}

function learningAgent(memoryEnabled = true) {
  return {
    id: "agent-1",
    user_id: "user-1",
    name: "Market Analyst",
    memory_enabled: memoryEnabled,
    allowed_tools: ["web"],
    model_provider: "openai",
    model: "gpt-5-mini",
    system_prompt: "You are a market analyst.",
    updated_at: "2026-09-18T00:00:00.000Z",
    operating_profile: {
      role: "Market analyst",
      objective: "Produce evidence-backed market analysis",
      skills: ["Market research"],
      skills_registry: {
        version: 1,
        skills: [{
          name: "Market research",
          proficiency: 0.6,
          learnable: true,
          evidence: [{ kind: "declared", verified: false }],
        }],
      },
    },
  };
}

describe("verified skill learning persistence", () => {
  it("persists verified evidence and recompiles the operating-profile prompt", async () => {
    const sb = createFakeSupabase({
      personal_agents: [learningAgent()],
      agent_tasks: [verifiedTask()],
    });

    const result = await captureVerifiedAgentSkillLearning({
      sb,
      userId: "user-1",
      taskId: "task-1",
    });

    expect(result?.changed).toBe(true);
    const saved = sb.tables["personal_agents"]?.[0];
    const skill = saved?.["operating_profile"]?.skills_registry?.skills?.[0];
    expect(skill?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "verified_task",
        reference: "task:task-1",
        verified: true,
        score: 0.95,
      }),
    ]));
    expect(saved?.["system_prompt"]).toContain("UNIVERSAL SKILLS REGISTRY");

    await captureVerifiedAgentSkillLearning({
      sb,
      userId: "user-1",
      taskId: "task-1",
    });
    const repeated = sb.tables["personal_agents"]?.[0]?.operating_profile?.skills_registry?.skills?.[0]?.evidence
      ?.filter((item: { reference?: string }) => item.reference === "task:task-1");
    expect(repeated).toHaveLength(1);
  });

  it("respects the existing durable-learning opt-out", async () => {
    const agent = learningAgent(false);
    const sb = createFakeSupabase({
      personal_agents: [agent],
      agent_tasks: [verifiedTask()],
    });

    const result = await captureVerifiedAgentSkillLearning({
      sb,
      userId: "user-1",
      taskId: "task-1",
    });

    expect(result).toBeNull();
    expect(sb.tables["personal_agents"]?.[0]?.operating_profile).toEqual(agent.operating_profile);
  });
});
