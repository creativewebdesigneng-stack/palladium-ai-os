import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const workforceSource = readFileSync(
  fileURLToPath(new URL("../workforce.server.ts", import.meta.url)),
  "utf8",
);

describe("workforce planner/verifier contract", () => {
  it("routes workflow agent steps through the planner-aware runtime", () => {
    expect(workforceSource).toContain('import { executePlannedRun } from "./planner-runtime.server"');
    expect(workforceSource).toContain("task = await executePlannedRun({");
    expect(workforceSource).not.toContain("task = await executeRun({");
  });
});
