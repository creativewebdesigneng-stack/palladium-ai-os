import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tool = readFileSync("src/lib/social/social-agent-tool.server.ts", "utf8");
const runtime = readFileSync("src/lib/runtime/tools.server.ts", "utf8");

describe("Social Operations agent wiring", () => {
  it("keeps the social tool bounded to planning and discovery", () => {
    expect(tool).toContain("SOCIAL_OPS_TOOL_DEF");
    expect(tool).toContain('["list_posts", "create_post", "schedule_post", "list_capabilities"]');
    expect(tool).toContain("integration_action");
    expect(tool).toContain("operator approvals remain authoritative");
    expect(tool).not.toContain('enum: ["publish"');
  });

  it("routes social_ops through the existing Harness and execution audit", () => {
    expect(runtime).toContain('"social_ops"');
    expect(runtime).toContain("SOCIAL_OPS_TOOL_DEF");
    expect(runtime).toContain("runSocialOpsTool");
    expect(runtime).toContain("assertHarnessToolInput(name, input, grant.allowedDomains)");
    expect(runtime).toContain('tool: name');
  });
});
