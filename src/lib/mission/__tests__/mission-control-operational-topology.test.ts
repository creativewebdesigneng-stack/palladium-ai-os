import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const deck = readFileSync(
  new URL("../../../components/mission/BlackstarCommandDeck.jsx", import.meta.url),
  "utf8",
);
const topology = readFileSync(
  new URL("../../../components/mission/OperationalTopology.jsx", import.meta.url),
  "utf8",
);

describe("Mission Control live operational topology", () => {
  it("wires the existing live Mission Control data into the spatial topology", () => {
    expect(deck).toContain("import OperationalTopology from '@/components/mission/OperationalTopology'");
    expect(deck).toContain("<OperationalTopology");
    for (const prop of ["metrics={metrics}", "tasks={tasks}", "approvals={approvals}", "notifications={notifications}", "activities={activities}", "connectedIntegrations={connectedIntegrations}"]) {
      expect(deck).toContain(prop);
    }
  });

  it("derives topology state from real provider, mission, approval, signal and workforce inputs", () => {
    expect(topology).toContain("connectedIntegrations.length");
    expect(topology).toContain("ACTIVE_TASK_STATUSES.has(task.status)");
    expect(topology).toContain("approval.status === 'pending'");
    expect(topology).toContain("!notification.read_at");
    expect(topology).toContain("metrics.activeWorkforces");
    expect(topology).toContain("No external provider links detected.");
    expect(topology).toContain("No missions currently in flight.");
  });

  it("labels the spatial view as logical rather than pretending to have geographic telemetry", () => {
    expect(topology).toContain("Logical topology · live account state · not geographic telemetry");
    expect(topology).not.toContain("Global infrastructure");
    expect(topology).not.toContain("worldwide nodes");
  });

  it("uses motion to communicate active paths and respects reduced-motion preferences", () => {
    expect(topology).toContain("useReducedMotion");
    expect(topology).toContain("active={state.providers > 0}");
    expect(topology).toContain("active={state.missions > 0}");
    expect(topology).toContain("active={state.approvals > 0}");
    expect(topology).toContain("active={state.signals > 0}");
    expect(topology).toContain("active={state.workforces > 0}");
    expect(topology).toContain("reduced || activePaths === 0 ? undefined");
  });
});
