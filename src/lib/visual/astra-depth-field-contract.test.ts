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
    expect(depth).toContain("pointer-events");
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

  it("provides distinct room palettes and mounts behind the operational shell", () => {
    for (const room of [
      "astra-room-mission",
      "astra-room-hub",
      "astra-room-workforce",
      "astra-room-finance",
      "astra-room-legal",
      "astra-room-studio",
      "astra-room-memory",
      "astra-room-admin",
    ]) {
      expect(depth).toContain(room);
    }
    expect(shell).toContain("import AstraDepthField from '@/components/blackstar/AstraDepthField'");
    expect(shell).toContain("<AstraDepthField room={room} />");
    expect(shell.indexOf("<AstraDepthField room={room} />"))
      .toBeLessThan(shell.indexOf("<Sidebar"));
  });
});
