import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../orchestrator.server.ts", import.meta.url)),
  "utf8",
);

describe("orchestrator task similarity contract", () => {
  it("loads task inputs and computes goal-specific performance evidence", () => {
    expect(source).toContain("summariseSimilarPerformance");
    expect(source).toContain('select("agent_id,status,input,duration_ms,replan_count,verification_state,created_at")');
    expect(source).toContain("similar_performance: summariseSimilarPerformance");
    expect(source).toContain("goal: string");
    expect(source).toContain("goal,");
  });
});
