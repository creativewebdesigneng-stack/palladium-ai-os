import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const functions = readFileSync("src/lib/admin/acceptance.functions.ts", "utf8");
const screen = readFileSync("src/screens/AdminAcceptance.jsx", "utf8");

describe("operational acceptance read-only preflight contract", () => {
  it("reuses the existing Cinema and 3D health probes", () => {
    expect(functions).toContain("probeCinemaMasterConnection");
    expect(functions).toContain("probeThreeDWorker");
    expect(functions).toContain("normalizeOperationalProbe");
    expect(screen).toContain("Run read-only preflight");
    expect(screen).toContain("Readiness is not render certification");
  });

  it("does not write acceptance outcomes or queue execution from the preflight server function", () => {
    const start = functions.indexOf("export const runOperationalAcceptancePreflight");
    const end = functions.indexOf("export const saveOperationalAcceptanceResult", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = functions.slice(start, end);

    expect(block).not.toContain(".insert(");
    expect(block).not.toContain(".upsert(");
    expect(block).not.toContain(".update(");
    expect(block).not.toContain(".delete(");
    expect(block).not.toContain("writeAudit(");
    expect(block).not.toContain("submitCinema");
    expect(block).not.toContain("submitThreeD");
    expect(block).toContain("does not create a render, output, transaction, acceptance result or certification");
  });
});
