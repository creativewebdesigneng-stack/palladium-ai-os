import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../agent-improvement.functions.ts", import.meta.url)),
  "utf8",
);

describe("agent improvement insights API", () => {
  it("is authenticated, owner-scoped and based on bounded recent task evidence", () => {
    expect(source).toContain("requireSupabaseAuth");
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.from("agent_tasks")');
    expect(source).toContain("verification_state");
    expect(source).toContain("replan_count");
    expect(source).toContain(".limit(50)");
    expect(source).toContain("analyseAgentImprovement");
  });
});
