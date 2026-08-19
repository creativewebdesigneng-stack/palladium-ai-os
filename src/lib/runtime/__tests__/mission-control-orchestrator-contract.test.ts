import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const missionControl = readFileSync(
  fileURLToPath(new URL("../../../screens/MissionControl.jsx", import.meta.url)),
  "utf8",
);
const orchestratorConsole = readFileSync(
  fileURLToPath(new URL("../../../components/mission/OrchestratorConsole.jsx", import.meta.url)),
  "utf8",
);

describe("Mission Control orchestrator surface", () => {
  it("wires the authenticated Palladium Orchestrator into Mission Control", () => {
    expect(missionControl).toContain("runOrchestrator");
    expect(missionControl).toContain("useServerFn(runOrchestrator)");
    expect(missionControl).toContain("['orchestrator', 'Orchestrator', Network]");
    expect(missionControl).toContain("const orchestrate = useMutation");
    expect(missionControl).toContain("tab === 'orchestrator'");
    expect(missionControl).toContain("<OrchestratorConsole");
  });

  it("keeps Mission Control readable instead of flattening the screen into minified lines", () => {
    expect(missionControl.split("\n").length).toBeGreaterThan(450);
  });

  it("shows delegation, approvals and verified output in the orchestrator console", () => {
    expect(orchestratorConsole).toContain("Agent permissions stay isolated");
    expect(orchestratorConsole).toContain("assignment.depends_on");
    expect(orchestratorConsole).toContain("Approval gate required");
    expect(orchestratorConsole).toContain("Verified mission output");
  });
});
