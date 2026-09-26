import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar Astra WebGL depth field contract", () => {
  const depth = readFileSync(
    new URL("../../components/blackstar/AstraDepthField.jsx", import.meta.url),
    "utf8",
  );
  const shell = readFileSync(
    new URL("../../components/palladium/AppShell.jsx", import.meta.url),
    "utf8",
  );
  const scenes = readFileSync(
    new URL("../../components/blackstar/astra-scenes.js", import.meta.url),
    "utf8",
  );

  it("uses the installed Three.js runtime as a progressive enhancement", () => {
    expect(depth).toContain("await import('three')");
    expect(depth).toContain("new THREE.WebGLRenderer");
    expect(depth).toContain("new THREE.IcosahedronGeometry");
    expect(depth).toContain("new THREE.TorusGeometry");
    expect(depth).toContain("new THREE.Points");
    expect(depth).toContain("catch {");
    expect(depth).toContain("The CSS/2D Blackstar atmosphere remains");
  });

  it("keeps the scene non-interactive and adapts to mobile and reduced-motion users", () => {
    expect(shell).toContain("pointer-events-none fixed inset-0 opacity-75");
    expect(depth).not.toContain("mousemove");
    expect(depth).toContain("prefers-reduced-motion: reduce");
    expect(depth).toContain("max-width: 767px");
    expect(depth).toContain("mobile ? 1.15 : 1.5");
    expect(depth).toContain("if (!reduceMotion && !document.hidden)");
  });

  it("pauses hidden tabs and disposes every GPU allocation created by the scene", () => {
    expect(depth).toContain("visibilitychange");
    expect(depth).toContain("resizeObserver?.disconnect()");
    expect(depth).toContain("particleGeometry?.dispose()");
    expect(depth).toContain("particleMaterial?.dispose()");
    expect(depth).toContain("coreGeometry?.dispose()");
    expect(depth).toContain("coreMaterial?.dispose()");
    expect(depth).toContain("haloGeometry?.dispose()");
    expect(depth).toContain("ringAGeometry?.dispose()");
    expect(depth).toContain("ringBGeometry?.dispose()");
    expect(depth).toContain("renderer?.dispose()");
  });

  it("provides distinct scene composition and mounts behind the operational shell", () => {
    for (const scene of [
      "mission",
      "ai-hub",
      "agents",
      "workforce",
      "finance",
      "trading",
      "legal",
      "compliance",
      "cinema",
      "game-foundry",
      "website-studio",
      "marketplace",
      "company",
      "industry",
      "construction",
      "retail",
      "health",
      "memory",
      "knowledge",
      "projects",
      "developer",
      "automation",
      "security",
      "admin",
    ]) {
      expect(scenes).toContain(`${scene}:`);
    }
    expect(depth).toContain("ASTRA_SCENES[sceneKey]");
    expect(depth).toContain("camera.position.set(...palette.camera)");
    expect(depth).toContain("core.position.set(...palette.core)");
    expect(shell).toContain("import { resolveAstraScene } from '@/components/blackstar/astra-scenes'");
    expect(shell).toContain("<AstraDepthField room={room} sceneKey={scene} />");
    expect(shell.indexOf("<AstraDepthField room={room} sceneKey={scene} />"))
      .toBeLessThan(shell.indexOf("<Sidebar"));
  });
});
