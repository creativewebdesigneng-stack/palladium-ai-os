import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtime = readFileSync(new URL("../runtime.server.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../run-resume-worker.server.ts", import.meta.url), "utf8");

describe("agent crash recovery", () => {
  it("keeps recovery in the canonical scheduler rather than request preparation", () => {
    expect(runtime).not.toContain("await reapStale(");
    expect(worker).toContain("claimResumableRun(");
    expect(worker).toContain("parseDurableRunCheckpoint");
    expect(worker).toContain("MAX_RESUME_ATTEMPTS = 3");
    expect(worker).toContain("releaseRunResumeLease");
  });
});
