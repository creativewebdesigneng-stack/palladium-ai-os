import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const server = readFileSync("src/lib/integrations/linkedin-social.server.ts", "utf8");
const actions = readFileSync("src/lib/integrations/linkedin-social-actions.server.ts", "utf8");
const adapter = readFileSync("src/lib/integrations/linkedin-integration-adapter.server.ts", "utf8");
const runtime = readFileSync("src/lib/integrations/agent-integration-runtime.server.ts", "utf8");

describe("native LinkedIn member posting", () => {
  it("resolves the author only from LinkedIn's current-member Profile API", () => {
    expect(server).toContain('`${LINKEDIN_API}/me`');
    expect(server).toContain('profile["id"]');
    expect(server).toContain('`urn:li:person:${id}`');
    expect(server).not.toMatch(/userinfo.*sub|profile\["sub"\]|author_urn/i);
  });

  it("keeps author identity out of the caller action schema", () => {
    expect(actions).toContain('required: ["text"]');
    expect(JSON.stringify(actions)).not.toMatch(/author_urn|person_urn/);
    expect(actions).toContain("hasNativeLinkedInPostingCapability");
    expect(actions).toContain("resolveLinkedInMemberAuthor");
  });

  it("is approval-required and non-replayable after provider dispatch", () => {
    expect(adapter).toContain('requiresApproval: true');
    expect(adapter).toContain('failurePhase: "ambiguous"');
    expect(adapter).toContain('safeToFailover: false');
    expect(server).toContain('/ugcPosts');
    expect(server).toContain('"X-RestLi-Protocol-Version": "2.0.0"');
  });

  it("uses Blackstar's existing direct_oauth runtime instead of a new transport", () => {
    expect(runtime).toContain("linkedinIntegrationAdapter");
    expect(runtime).toContain('provider === "linkedin"');
    expect(adapter).toContain('id: "direct_oauth"');
  });
});
