import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../runtime.functions.ts"), "utf8");

describe("agent deliverable contract", () => {
  it("never accepts a successful task with an empty user-visible deliverable", () => {
    expect(source).toContain("function taskOutputText(task: unknown)");
    expect(source).toContain("DELIVERABLE RECOVERY REQUIRED.");
    expect(source).toContain("EMPTY_DELIVERABLE");
    expect(source).toContain("if (!taskOutputText(task))");
  });

  it("only captures verified experience after a non-empty deliverable exists", () => {
    const outputGuard = source.indexOf("const output = taskOutputText(task)");
    const capture = source.indexOf("await captureVerifiedAgentExperience");
    expect(outputGuard).toBeGreaterThan(-1);
    expect(capture).toBeGreaterThan(outputGuard);
  });
});
