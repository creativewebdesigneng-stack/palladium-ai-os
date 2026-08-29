import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const tools = readFileSync(
  fileURLToPath(new URL("../../runtime/tools.server.ts", import.meta.url)),
  "utf8",
);

describe("App Studio runtime wiring", () => {
  it("replaces the legacy core definition with the expanded App Studio definition", () => {
    expect(tools).toContain("APP_STUDIO_TOOL_DEF");
    expect(tools).toContain('definition.name === "app_studio" ? APP_STUDIO_TOOL_DEF : definition');
  });

  it("executes App Studio through the bounded dedicated runtime and Harness", () => {
    expect(tools).toContain('name !== "skill_script" && name !== "app_studio"');
    expect(tools).toContain("assertHarnessToolInput(name, input, grant.allowedDomains)");
    expect(tools).toContain("runAppStudioTool");
    expect(tools).toContain('tool: name');
  });

  it("preserves per-agent approval policy for App Studio editing", () => {
    expect(tools).toContain('name === "app_studio" && grant.requiresApproval');
    expect(tools).toContain("requires_approval: true");
  });
});
