import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  capabilityHintsFromObjective,
  selectFallbackAutonomousTeam,
} from "../autonomous-dynamic-team.server";

const scheduler = readFileSync(
  fileURLToPath(new URL("../autonomous-os.scheduler.server.ts", import.meta.url)),
  "utf8",
);
const controlScreen = readFileSync(
  fileURLToPath(new URL("../../../screens/ComputerControl.jsx", import.meta.url)),
  "utf8",
);

describe("Autonomous OS dynamic team fallback", () => {
  it("matches required capabilities from the goal objective against known agent tools", () => {
    expect(capabilityHintsFromObjective("Use web_search then memory to brief me", ["web_search", "memory", "browser"]))
      .toEqual(["web_search", "memory"]);
  });

  it("forms a capability-covered team when the objective names existing tools", () => {
    const plan = selectFallbackAutonomousTeam([
      { agentId: "research", capabilities: ["web_search"], trustScore: 0.9, available: true, activeWorkloads: 0 },
      { agentId: "ops", capabilities: ["browser"], trustScore: 0.95, available: true, activeWorkloads: 0 },
    ], {
      missionId: "goal-1",
      objective: "Run web_search for competitors",
      maxTeamSize: 3,
    });

    expect(plan.ready).toBe(true);
    expect(plan.agentIds).toEqual(["research"]);
    expect(plan.capabilityAssignments.web_search).toBe("research");
  });

  it("falls back to highest-trust available agents when the objective names no tools", () => {
    const plan = selectFallbackAutonomousTeam([
      { agentId: "b", capabilities: ["browser"], trustScore: 0.4, available: true, activeWorkloads: 0 },
      { agentId: "a", capabilities: ["web_search"], trustScore: 0.8, available: true, activeWorkloads: 0 },
    ], {
      missionId: "goal-2",
      objective: "Expand the Tokyo operation",
      maxTeamSize: 1,
    });

    expect(plan.ready).toBe(true);
    expect(plan.agentIds).toEqual(["a"]);
    expect(plan.coveredCapabilities).toEqual([]);
  });

  it("wires the fallback into Autonomous OS fleet persistence", () => {
    expect(scheduler).toContain("planFallbackAutonomousTeam");
    expect(scheduler).toContain("Dynamic team fallback");
    expect(scheduler).toContain("autonomous_goal_fleet_assignments");
  });

  it("renders the Computer Use verdict from recorded sessions", () => {
    expect(controlScreen).toContain("Computer-use policy verdict");
    expect(controlScreen).toContain("policyPlan");
  });
});
