import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const missionControl = readFileSync(
  fileURLToPath(new URL("../../../screens/MissionControl.jsx", import.meta.url)),
  "utf8",
);
const commandDeck = readFileSync(
  fileURLToPath(new URL("../../../components/mission/BlackstarCommandDeck.jsx", import.meta.url)),
  "utf8",
);
const orchestratorConsole = readFileSync(
  fileURLToPath(new URL("../../../components/mission/OrchestratorConsole.jsx", import.meta.url)),
  "utf8",
);

describe("Mission Control orchestrator surface", () => {
  it("wires the authenticated Blackstar Orchestrator into Mission Control", () => {
    expect(missionControl).toContain("runOrchestrator");
    expect(missionControl).toContain("useServerFn(runOrchestrator)");
    expect(missionControl).toMatch(/\[\s*'orchestrator'\s*,\s*'Orchestrator'\s*,\s*Network\s*\]/);
    expect(missionControl).toMatch(/const\s+orchestrate\s*=\s*useMutation/);
    expect(missionControl).toMatch(/tab\s*===\s*'orchestrator'/);
    expect(missionControl).toContain("<OrchestratorConsole");
  });

  it("keeps the full command deck decomposed into dedicated operational surfaces", () => {
    expect(missionControl).toContain("BlackstarCommandDeck");
    expect(commandDeck).toContain("function HolographicCore");
    expect(commandDeck).toContain("function AlertPanel");
    expect(commandDeck).toContain("function TelemetryPanel");
    expect(commandDeck).toContain("function MissionQueue");
    expect(commandDeck).toContain("function LiveFeed");
    expect(commandDeck).toContain("function PendingApprovals");
    expect(commandDeck).toContain("function GlobalInfrastructure");
    expect(commandDeck).toContain("function Heartbeat");
    expect(commandDeck).toContain("function HealthMonitor");
    expect(commandDeck).toContain("function LiveTicker");
  });

  it("shows delegation, approvals and verified output in the orchestrator console", () => {
    expect(orchestratorConsole).toContain("Isolated permissions");
    expect(orchestratorConsole).toContain("assignment.depends_on");
    expect(orchestratorConsole).toContain("Human approval gate");
    expect(orchestratorConsole).toContain("Verified mission output");
  });
});
