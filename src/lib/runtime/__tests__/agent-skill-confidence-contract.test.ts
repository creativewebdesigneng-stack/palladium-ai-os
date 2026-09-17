import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directSource = readFileSync(
  fileURLToPath(new URL("../agent-task-execution.server.ts", import.meta.url)),
  "utf8",
);
const workforceSource = readFileSync(
  fileURLToPath(new URL("../workforce.server.ts", import.meta.url)),
  "utf8",
);

describe("verified skill confidence runtime contract", () => {
  it("captures negative skill evidence only behind VERIFICATION_FAILED in direct runtime", () => {
    expect(directSource).toContain("captureVerifiedAgentSkillFailure");
    expect(directSource).toContain("error.code === 'VERIFICATION_FAILED'");
    expect(directSource.indexOf("await failRun(")).toBeLessThan(
      directSource.indexOf("await captureVerifiedAgentSkillFailure("),
    );
  });

  it("captures negative skill evidence only behind VERIFICATION_FAILED in workforce runtime", () => {
    expect(workforceSource).toContain("captureVerifiedAgentSkillFailure");
    expect(workforceSource).toContain('attempt === attemptsAllowed && error instanceof RuntimeError && error.code === "VERIFICATION_FAILED"');
    expect(workforceSource.indexOf("await failRun(")).toBeLessThan(
      workforceSource.indexOf("await captureVerifiedAgentSkillFailure("),
    );
  });
});
