import { describe, expect, it } from "vitest";
import { capabilityProfile } from "../capability-catalog";
import { resolveExecutionRoute } from "../execution-fabric.server";
import {
  desktopActionRisk,
  isDesktopActionAllowed,
  type DesktopWorkerContext,
} from "@/lib/mission/desktop-worker";

const desktopCtx: DesktopWorkerContext = {
  userId: "user-1",
  agentId: "agent-1",
  taskId: "task-1",
  machineId: "machine-1",
  allowedApps: ["chrome", "excel"],
  allowedPaths: ["C:/Users/Operator/PalladiumWork"],
};

describe("provider-neutral execution fabric", () => {
  it("prefers a direct API but can fall back to connector, browser and desktop lanes", () => {
    const route = resolveExecutionRoute({
      provider: "shopify",
      family: "ecommerce",
      availability: {
        directApi: true,
        connectorTransport: true,
        browser: true,
        desktopWorker: true,
      },
    });
    expect(route.primary).toBe("direct_api");
    expect(route.lanes).toEqual(["direct_api", "connector_transport", "browser"]);
  });

  it("uses browser when no API or connector transport is available", () => {
    const route = resolveExecutionRoute({
      provider: "etsy",
      availability: { browser: true },
    });
    expect(route.family).toBe("ecommerce");
    expect(route.primary).toBe("browser");
  });

  it("labels future store/social providers without pretending they are already native", () => {
    expect(capabilityProfile("shopify")?.status).toBe("planned");
    expect(capabilityProfile("instagram")?.families).toContain("social_media");
  });
});

describe("desktop worker policy", () => {
  it("allows only explicitly assigned apps", () => {
    expect(isDesktopActionAllowed({ kind: "launch_app", target: "excel" }, desktopCtx)).toBe(true);
    expect(isDesktopActionAllowed({ kind: "launch_app", target: "powershell" }, desktopCtx)).toBe(false);
  });

  it("keeps file access inside assigned roots", () => {
    expect(
      isDesktopActionAllowed(
        { kind: "file_open", path: "C:/Users/Operator/PalladiumWork/orders.csv" },
        desktopCtx,
      ),
    ).toBe(true);
    expect(
      isDesktopActionAllowed({ kind: "file_open", path: "C:/Windows/System32/config" }, desktopCtx),
    ).toBe(false);
  });

  it("classifies writes more strictly than screen reads", () => {
    expect(desktopActionRisk({ kind: "read_screen" })).toBe("low");
    expect(desktopActionRisk({ kind: "type", text: "hello" })).toBe("medium");
    expect(desktopActionRisk({ kind: "file_save", path: "C:/Users/Operator/PalladiumWork/a.txt" })).toBe("high");
  });
});
