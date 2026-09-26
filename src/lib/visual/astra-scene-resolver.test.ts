import { describe, expect, it } from "vitest";
import {
  ASTRA_SCENES,
  resolveAstraScene,
} from "../../components/blackstar/astra-scenes";

describe("Blackstar route-specific 3D scenes", () => {
  it.each([
    ["/mission-control", "mission"],
    ["/ai-hub", "ai-hub"],
    ["/ai-workbench", "ai-hub"],
    ["/agents", "agents"],
    ["/agents/example/playground", "agents"],
    ["/workforce", "workforce"],
    ["/finance", "finance"],
    ["/trading-hub", "trading"],
    ["/quant-studio", "trading"],
    ["/legal", "legal"],
    ["/compliance-sentinel", "compliance"],
    ["/cinema-studio", "cinema"],
    ["/game-foundry", "game-foundry"],
    ["/three-d-studio", "game-foundry"],
    ["/website-studio", "website-studio"],
    ["/marketplace", "marketplace"],
    ["/creator-marketplace", "marketplace"],
    ["/company-hub", "company"],
    ["/industry-hub", "industry"],
    ["/construction-industrial-hub", "construction"],
    ["/retail-hub", "retail"],
    ["/commerce-studio", "commerce"],
    ["/health-fitness", "health"],
    ["/memory", "memory"],
    ["/knowledge", "knowledge"],
    ["/projects", "projects"],
    ["/developer-portal", "developer"],
    ["/automation", "automation"],
    ["/security", "security"],
    ["/admin/security", "admin"],
    ["/models", "models"],
  ])("maps %s to %s", (pathname, scene) => {
    expect(resolveAstraScene(pathname)).toBe(scene);
    expect(ASTRA_SCENES[scene as keyof typeof ASTRA_SCENES]).toBeTruthy();
  });

  it("falls back safely for routes without a dedicated scene", () => {
    expect(resolveAstraScene("/dashboard")).toBe("default");
    expect(resolveAstraScene("")).toBe("default");
    expect(ASTRA_SCENES.default).toBeTruthy();
  });

  it("gives flagship rooms materially different geometry and motion, not color-only skins", () => {
    const mission = ASTRA_SCENES.mission;
    const trading = ASTRA_SCENES.trading;
    const legal = ASTRA_SCENES.legal;
    const cinema = ASTRA_SCENES.cinema;

    expect(mission.core).not.toEqual(trading.core);
    expect(trading.camera).not.toEqual(legal.camera);
    expect(legal.ringA).not.toEqual(cinema.ringA);
    expect(cinema.ySpread).not.toBe(mission.ySpread);
    expect(mission.motion).not.toBe(legal.motion);
    expect(trading.primary).not.toBe(cinema.primary);
  });

  it("keeps every scene configuration complete enough for the WebGL renderer", () => {
    for (const [name, scene] of Object.entries(ASTRA_SCENES)) {
      expect(scene.primary, name).toBeTypeOf("number");
      expect(scene.secondary, name).toBeTypeOf("number");
      expect(scene.density, name).toBeGreaterThan(0);
      expect(scene.motion, name).toBeGreaterThan(0);
      expect(scene.core, name).toHaveLength(3);
      expect(scene.camera, name).toHaveLength(3);
      expect(scene.ringA, name).toHaveLength(3);
      expect(scene.ringB, name).toHaveLength(3);
      expect(scene.radiusMin, name).toBeGreaterThan(0);
      expect(scene.radiusRange, name).toBeGreaterThan(0);
      expect(scene.ySpread, name).toBeGreaterThan(0);
    }
  });
});
