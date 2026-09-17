import { describe, expect, it } from "vitest";
import { buildBlackstarRouteInventory, inspectionTargets } from "../route-inventory";

describe("Blackstar route inventory", () => {
  it("derives static app pages and excludes infrastructure routes", () => {
    const inventory = buildBlackstarRouteInventory([
      "src/routes/_shell/_app/ai-hub.tsx",
      "src/routes/_shell/_app/admin.index.tsx",
      "src/routes/_shell/_app/agents.$id.playground.tsx",
      "src/routes/api/assistant.ts",
      "src/routes/[.mcp]/list-tools.ts",
      "src/routes/__root.tsx",
    ]);

    expect(inventory.map((item) => item.route)).toEqual([
      "/admin",
      "/agents/:id/playground",
      "/ai-hub",
    ]);
    expect(inspectionTargets(inventory)).toEqual(["/admin", "/ai-hub"]);
  });

  it("deduplicates route aliases and does not auto-inspect dynamic pages", () => {
    const inventory = buildBlackstarRouteInventory([
      "src/routes/_shell/_app/agents.index.tsx",
      "src/routes/_shell/_app/agents.index.tsx",
      "src/routes/_shell/_app/agents.$id.index.tsx",
    ]);

    expect(inventory).toHaveLength(2);
    expect(inventory.find((item) => item.route === "/agents/:id")?.inspectable).toBe(false);
  });
});
