import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtime = readFileSync(new URL("../runtime.server.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../run-resume-worker.server.ts", import.meta.url), "utf8");
const publicRuntimeApi = readFileSync(new URL("../runtime.functions.ts", import.meta.url), "utf8");

describe("agent crash recovery", () => {
  it("keeps recovery in the canonical scheduler rather than request preparation", () => {
    expect(runtime).not.toContain("await reapStale(");
    expect(worker).toContain("claimResumableRun(");
    expect(worker).toContain("parseDurableRunCheckpoint");
    expect(worker).toContain("MAX_RESUME_ATTEMPTS = 3");
    expect(worker).toContain("releaseRunResumeLease");
    expect(publicRuntimeApi).not.toContain('rpc("reap_stale_agent_tasks"');
    expect(publicRuntimeApi).not.toContain("processResumableAgentRuns(");
    expect(publicRuntimeApi).toContain("Manual stale-run reaping has been retired");
  });
});
