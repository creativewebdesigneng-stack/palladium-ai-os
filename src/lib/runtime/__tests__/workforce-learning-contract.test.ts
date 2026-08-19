import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const workforceSource = readFileSync(
  fileURLToPath(new URL("../workforce.server.ts", import.meta.url)),
  "utf8",
);

describe("workforce verified learning contract", () => {
  it("captures verified experience after a planner-approved agent step succeeds", () => {
    expect(workforceSource).toContain(
      'import { captureVerifiedAgentExperience } from "./agent-learning.server"',
    );
    expect(workforceSource).toContain("task = await executePlannedRun({");
    expect(workforceSource).toContain("await captureVerifiedAgentExperience({");
    expect(workforceSource).toContain("taskId: run.taskId");

    const executeIndex = workforceSource.indexOf("task = await executePlannedRun({");
    const learningIndex = workforceSource.indexOf("await captureVerifiedAgentExperience({");
    expect(executeIndex).toBeGreaterThanOrEqual(0);
    expect(learningIndex).toBeGreaterThan(executeIndex);
  });
});
