import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Mission Control truthful command deck", () => {
  const screen = readFileSync(new URL("../../../screens/MissionControl.jsx", import.meta.url), "utf8");
  const deck = readFileSync(new URL("../../../components/mission/BlackstarCommandDeck.jsx", import.meta.url), "utf8");

  it("feeds verified connected-provider evidence from the Mission Control overview", () => {
    expect(screen).toContain("connectedIntegrations={data?.connectedIntegrations ?? []}");
    expect(deck).toContain("connectedIntegrations = []");
    expect(deck).toContain("connectedIntegrations.length");
    expect(deck).toContain("integration.name || integration.provider");
  });

  it("uses live counts in the moving command-room nodes instead of decorative readiness claims", () => {
    expect(deck).toContain('label="Provider links"');
    expect(deck).toContain('${connectedIntegrations} connected');
    expect(deck).toContain('label="Approval gates"');
    expect(deck).toContain('${pendingApprovals} pending');
    expect(deck).toContain('label="Signals"');
    expect(deck).toContain('${unreadSignals} unread');
    expect(deck).toContain('label="Workforces"');
    expect(deck).toContain('${activeWorkforces} active');
    expect(deck).not.toContain('label="MCP servers" value="Connected"');
    expect(deck).not.toContain('value="Runtime ready"');
    expect(deck).not.toContain('value="Observed"');
  });

  it("keeps the holographic core readable on small screens", () => {
    expect(deck).toContain("hidden min-w-[130px]");
    expect(deck).toContain("lg:block");
  });

  it("stops continuous command-room motion for reduced-motion users", () => {
    expect(deck).toContain("animate={reduced ? undefined");
    expect(deck).toContain("transition={reduced ? undefined");
  });

  it("does not claim an external provider plane exists when none is connected", () => {
    expect(deck).toContain("No external provider links detected.");
    expect(deck).toContain("connected external provider");
  });
});
