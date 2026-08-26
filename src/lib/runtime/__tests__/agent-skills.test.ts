import { describe, expect, it } from "vitest";
import { renderRuntimeSkills } from "../agent-skills.server";

const skill = {
  id: "skill-1",
  name: "Shopify Catalogue Specialist",
  description: "Maintain accurate product catalogue information.",
  instructions: "Verify product facts before proposing catalogue changes. Never claim a write succeeded without tool confirmation.",
  recommended_tools: ["web_search", "connected_service", "email_send"],
  version: 2,
};

describe("reusable runtime skills", () => {
  it("renders bounded reusable operating guidance", () => {
    const prompt = renderRuntimeSkills({
      skills: [skill],
      grantedTools: ["web_search", "connected_service"],
    });
    expect(prompt).toContain("Shopify Catalogue Specialist (v2)");
    expect(prompt).toContain("Verify product facts");
    expect(prompt).toContain("web_search, connected_service");
    expect(prompt).not.toContain("email_send");
  });

  it("never presents ungranted recommended tools as capabilities", () => {
    const prompt = renderRuntimeSkills({ skills: [skill], grantedTools: [] });
    expect(prompt).toContain("No additional tool permissions are granted by this skill.");
    expect(prompt).not.toContain("Already-granted tools relevant to this skill: email_send");
  });

  it("bounds the number and total size of skill instructions", () => {
    const skills = Array.from({ length: 20 }, (_, index) => ({
      ...skill,
      id: `skill-${index}`,
      name: `Skill ${index}`,
      instructions: "x".repeat(12_000),
    }));
    const prompt = renderRuntimeSkills({ skills, grantedTools: ["web_search"] });
    expect(prompt.length).toBeLessThanOrEqual(24_000);
    expect(prompt).toContain("Skill 0");
    expect(prompt).not.toContain("Skill 19");
  });

  it("emphasises that runtime permission policy remains authoritative", () => {
    const prompt = renderRuntimeSkills({ skills: [skill], grantedTools: ["web_search"] });
    expect(prompt).toContain("never expand tool permissions");
    expect(prompt).toContain("Existing runtime policy always wins");
  });
});
