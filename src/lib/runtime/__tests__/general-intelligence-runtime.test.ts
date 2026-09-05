import { describe, expect, it } from "vitest";
import type { Agent } from "../runtime.server";
import { buildRuntimeIntelligenceControl } from "../general-intelligence-runtime";

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    user_id: "user-1",
    org_id: null,
    org_id_fk: null,
    name: "Research Engineer",
    description: null,
    purpose: "Research evidence and implement software",
    personality: null,
    instructions: null,
    system_prompt: null,
    model_provider: "openai",
    model: "gpt-5",
    temperature: null,
    max_tokens: null,
    memory_enabled: true,
    allowed_tools: ["web_search", "github"],
    allowed_providers: ["github"],
    requires_approval: false,
    autonomy: "execute",
    status: "active",
    category: "engineering",
    ...overrides,
  };
}

describe("runtime general intelligence control", () => {
  it("injects the bounded control contract for a normal agent task", () => {
    const control = buildRuntimeIntelligenceControl({
      agent: agent(),
      input: "Research the evidence and implement the software change",
    });
    expect(control.prompt).toContain("BLACKSTAR GENERAL INTELLIGENCE CONTROL");
    expect(control.prompt).toContain("Verification required: yes");
    expect(control.assessment.selected_agent_ids).toEqual(["agent-1"]);
  });

  it("preserves an agent's approval boundary", () => {
    const control = buildRuntimeIntelligenceControl({
      agent: agent({ requires_approval: true, autonomy: "approval_required" }),
      input: "Implement the software change",
    });
    expect(control.assessment.requires_approval).toBe(true);
    expect(control.prompt).toContain("Approval required: yes");
  });

  it("does not simulate extra agents when a cross-domain goal recommends delegation", () => {
    const control = buildRuntimeIntelligenceControl({
      agent: agent(),
      input: "Research the market, design the brand and implement the software",
    });
    expect(["delegate", "collective"]).toContain(control.assessment.mode);
    expect(control.assessment.selected_agent_ids).toEqual(["agent-1"]);
    expect(control.prompt).toContain("Do not simulate other agents");
    expect(control.prompt).toContain("separate authorised orchestration run");
  });
});
