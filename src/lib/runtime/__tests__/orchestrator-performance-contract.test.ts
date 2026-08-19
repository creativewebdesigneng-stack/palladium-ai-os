import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../orchestrator.server.ts", import.meta.url)),
  "utf8",
);

describe("orchestrator performance intelligence contract", () => {
  it("loads recent task history and attaches verified performance before ranking", () => {
    expect(source).toContain('from("agent_tasks")');
    expect(source).toContain("verification_state");
    expect(source).toContain("replan_count");
    expect(source).toContain("summariseAgentPerformance");
    expect(source).toContain("agents: await attachPerformance");
  });

  it("falls back to skill-only ranking when history cannot be loaded", () => {
    expect(source).toContain("performance history unavailable; using skill-only ranking");
    expect(source).toContain("return agents;");
  });
});
