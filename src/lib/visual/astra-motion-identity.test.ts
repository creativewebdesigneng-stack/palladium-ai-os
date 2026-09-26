import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar Astra motion identity", () => {
  const mark = readFileSync(
    new URL("../../components/blackstar/AstraMark.jsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../../components/blackstar/blackstar-astra.css", import.meta.url),
    "utf8",
  );
  const deck = readFileSync(
    new URL("../../components/mission/BlackstarCommandDeck.jsx", import.meta.url),
    "utf8",
  );
  const brand = readFileSync(
    new URL("../../components/mission/CommandDeckBrand.jsx", import.meta.url),
    "utf8",
  );

  it("exposes semantic state on the custom mark without changing the bounded-intelligence identity", () => {
    expect(mark).toContain("state = 'idle'");
    expect(mark).toContain("data-state={state}");
    expect(mark).toContain("astra-ring-secondary");
    expect(mark).toContain("astra-star-facet");
    expect(mark).toContain("astra-core-halo");
    expect(mark).toContain("Astra-class intelligence");
    expect(mark).toContain("Not an AGI claim");
  });

  it("defines distinct visual behaviour for operational states and disables motion for reduced-motion users", () => {
    for (const state of ["ready", "syncing", "executing", "attention", "alert"]) {
      expect(css).toContain(`data-state='${state}'`);
    }
    expect(css).toContain("@keyframes astra-counter-orbit");
    expect(css).toContain("@keyframes astra-state-halo");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".astra-mark-live .astra-core-halo");
  });

  it("derives Mission Control mark state only from real load, failure, execution and approval signals", () => {
    expect(deck).toContain("const markState = loading");
    expect(deck).toContain("failedTasks");
    expect(deck).toContain("runningWork > 0");
    expect(deck).toContain("pendingApprovals");
    expect(deck).toContain("? 'syncing'");
    expect(deck).toContain("? 'alert'");
    expect(deck).toContain("? 'executing'");
    expect(deck).toContain("? 'attention'");
    expect(deck).toContain(": 'ready'");
    expect(deck).toContain("<CommandDeckBrand state={markState} />");
    expect(deck).toContain("<HolographicCore metrics={metrics} markState={markState} />");
    expect(brand).toContain('<AstraMark size={28} state={state}');
  });

  it("uses incident red only for the explicit alert state", () => {
    expect(css).toContain(".astra-mark-live[data-state='alert']");
    expect(css).toContain("stroke: #fb7185");
    const attention = css.slice(
      css.indexOf(".astra-mark-live[data-state='attention']"),
      css.indexOf(".astra-mark-live[data-state='alert']"),
    );
    expect(attention).toContain("stroke: #c9a227");
    expect(attention).not.toContain("#fb7185");
  });
});
