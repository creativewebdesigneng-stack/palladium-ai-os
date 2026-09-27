import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar off-screen visual suspension", () => {
  const neural = readFileSync(new URL("../../components/visual/NeuralSpace.jsx", import.meta.url), "utf8");

  it("observes whether a non-reduced-motion canvas is near the viewport", () => {
    expect(neural).toContain("typeof IntersectionObserver !== 'undefined'");
    expect(neural).toContain("intersectionObserver = new IntersectionObserver");
    expect(neural).toContain("intersectionObserver.observe(canvas)");
    expect(neural).toContain("rootMargin: '120px 0px'");
  });

  it("stops scheduling frames after the canvas leaves the viewport", () => {
    expect(neural).toContain("if (!reduce && !inViewport) return;");
    expect(neural).toContain("inViewport = nextVisible");
    expect(neural).toContain("cancelAnimationFrame(rafRef.current)");
  });

  it("restarts cleanly when the canvas becomes visible again", () => {
    expect(neural).toContain("if (inViewport && !document.hidden)");
    expect(neural).toContain("lastPaint = 0");
    expect(neural).toContain("requestAnimationFrame(draw)");
  });

  it("does not restart a hidden-tab canvas just because the document becomes visible if it remains off-screen", () => {
    expect(neural).toContain("else if (!reduce && inViewport)");
  });

  it("disconnects viewport observation on unmount", () => {
    expect(neural).toContain("intersectionObserver?.disconnect()");
  });
});
