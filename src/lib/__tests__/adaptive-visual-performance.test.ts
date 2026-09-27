import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar adaptive visual performance", () => {
  const neural = readFileSync(new URL("../../components/visual/NeuralSpace.jsx", import.meta.url), "utf8");
  const depth = readFileSync(new URL("../../components/blackstar/AstraDepthField.jsx", import.meta.url), "utf8");

  it("caps ambient 2D rendering instead of following 90/120Hz displays at full rate", () => {
    expect(neural).toContain("const targetFps = constrained ? 30 : 45");
    expect(neural).toContain("const frameInterval = 1000 / targetFps");
    expect(neural).toContain("now - lastPaint < frameInterval");
  });

  it("reduces canvas density and DPR on mobile or constrained devices", () => {
    expect(neural).toContain("navigator.connection?.saveData === true");
    expect(neural).toContain("navigator.deviceMemory");
    expect(neural).toContain("navigator.hardwareConcurrency");
    expect(neural).toContain("mobile ? 1.1 : constrained ? 1.35 : 1.75");
    expect(neural).toContain("mobile ? 0.42 : 0.68");
  });

  it("uses the same adaptive frame budget for the Three.js Astra field", () => {
    expect(depth).toContain("const targetFps = constrained ? 30 : 45");
    expect(depth).toContain("now - lastPaint < frameInterval");
    expect(depth).toContain("mobile ? 1 : constrained ? 1.25 : 1.5");
    expect(depth).toContain("mobile ? 44 : constrained ? 82 : 118");
  });

  it("keeps resize handling safe on browsers without ResizeObserver", () => {
    expect(depth).toContain("typeof ResizeObserver !== 'undefined'");
    expect(depth).toContain("window.addEventListener('resize', fallbackResize)");
    expect(depth).toContain("window.removeEventListener('resize', fallbackResize)");
  });

  it("preserves reduced-motion and visibility pausing behavior", () => {
    expect(neural).toContain("prefers-reduced-motion: reduce");
    expect(neural).toContain("document.addEventListener('visibilitychange', onVis)");
    expect(depth).toContain("prefers-reduced-motion: reduce");
    expect(depth).toContain("document.addEventListener('visibilitychange', onVisibility)");
  });
});
