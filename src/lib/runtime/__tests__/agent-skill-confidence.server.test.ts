import { describe, expect, it } from "vitest";
import { normaliseVerificationDecision } from "@/lib/agents/agent-planner";
import { captureVerifiedAgentSkillFailure } from "../agent-skill-confidence.server";
import { createFakeSupabase } from "./fake-supabase";

function agent() {
  return {
    id: "agent-1",
    user_id: "user-1",
    name: "Market Analyst",
    memory_enabled: true,
    allowed_tools: ["web"],
    model_provider: "openai",
    model: "gpt-5-mini",
    system_prompt: "You are a market analyst.",
    updated_at: "2026-09-18T00:00:00.000Z",
    operating_profile: {
      role: "Market analyst",
      skills: ["Market research"],
      skills_registry: {
        version: 1,
        skills: [{
          name: "Market research",
          proficiency: 0.72,
          learnable: true,
        }],
      },
    },
  };
}

function failedTask(id: string, issues: string[]) {
  return {
    id,
    agent_id: "agent-1",
    status: "failed",
    verification_state: normaliseVerificationDecision({
      passed: false,
      score: 0.35,
      issues,
      evidence: ["Verifier inspected the submitted deliverable"],
      next_action: "replan",
    }),
  };
}

describe("verified skill confidence persistence", () => {
  it("persists bounded negative evidence and reduces only after repeated capability failures", async () => {
    const sb = createFakeSupabase({
      personal_agents: [agent()],
      agent_tasks: [
        failedTask("fail-1", ["Market research claims lack source evidence"]),
        failedTask("fail-2", ["Market research methodology is unsupported"]),
      ],
    });

    const first = await captureVerifiedAgentSkillFailure({ sb, userId: "user-1", taskId: "fail-1" });
    expect(first?.reduced_skills).toEqual([]);

    const second = await captureVerifiedAgentSkillFailure({ sb, userId: "user-1", taskId: "fail-2" });
    expect(second?.reduced_skills).toEqual(["Market research"]);

    const skill = sb.tables["personal_agents"]?.[0]?.["operating_profile"]?.skills_registry?.skills?.[0];
    expect(skill?.proficiency).toBeLessThan(0.72);
    expect(skill?.evidence?.filter((item: { kind?: string }) => item.kind === "verified_failure")).toHaveLength(2);
  });

  it("does not penalise verifier infrastructure failure", async () => {
    const sb = createFakeSupabase({
      personal_agents: [agent()],
      agent_tasks: [failedTask("infra", ["Verification could not be completed"])],
    });

    const result = await captureVerifiedAgentSkillFailure({ sb, userId: "user-1", taskId: "infra" });

    expect(result).toBeNull();
    expect(sb.tables["personal_agents"]?.[0]?.["operating_profile"]?.skills_registry?.skills?.[0]?.proficiency).toBe(0.72);
  });
});
