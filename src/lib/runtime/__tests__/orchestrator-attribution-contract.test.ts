import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const server = readFileSync(
  fileURLToPath(new URL("../orchestrator.server.ts", import.meta.url)),
  "utf8",
);
const consoleSource = readFileSync(
  fileURLToPath(new URL("../../../components/mission/OrchestratorConsole.jsx", import.meta.url)),
  "utf8",
);

describe("orchestrator selection attribution contract", () => {
  it("attaches deterministic attribution after planner output and persists it with the workflow step", () => {
    expect(server).toContain("attachSelectionAttribution");
    expect(server).toContain("const attributed = attachSelectionAttribution(plan, shortlist)");
    expect(server).toContain("selection_attribution: assignment.selection_attribution ?? null");
    expect(server).toContain("plan: args.plan");
  });

  it("shows mission score evidence without presenting it as an authority grant", () => {
    expect(consoleSource).toContain("Selection evidence");
    expect(consoleSource).toContain("mission score");
    expect(consoleSource).toContain("score_breakdown");
    expect(consoleSource).toContain("matched_skills");
    expect(consoleSource).toContain("matched_tools");
    expect(consoleSource).toContain("matched_connectors");
    expect(consoleSource).toContain("deterministic pre-ranking evidence");
    expect(consoleSource).toContain("does not grant tools, permissions, connector access or approval rights");
  });
});
