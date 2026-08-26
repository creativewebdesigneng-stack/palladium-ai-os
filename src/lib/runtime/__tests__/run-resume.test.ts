import { describe, expect, it } from "vitest";
import { claimResumableRun, parseClaimedRunResume, releaseRunResumeLease } from "../run-resume.server";

const checkpoint = {
  schema: 1,
  phase: "model_boundary",
  safe_to_resume: true,
  saved_at: "2026-08-26T22:00:00.000Z",
  messages: [{ role: "user", content: "continue" }],
  plan: {
    objective: "test",
    assumptions: [],
    steps: [],
    current_step_id: null,
    verification_required: true,
    quality_threshold: 0.8,
    replan_count: 0,
    max_replans: 2,
  },
  tool_rounds: 1,
  tool_call_count: 2,
  usage: { input: 100, output: 20 },
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    user_id: "user-1",
    agent_id: "agent-1",
    org_id: null,
    provider: "openai",
    model: "gpt-test",
    resume_lease_token: "lease-1",
    checkpoint_state: checkpoint,
    ...overrides,
  };
}

describe("run resume claims", () => {
  it("parses only fully leased safe checkpoints", () => {
    const parsed = parseClaimedRunResume([row()]);
    expect(parsed?.taskId).toBe("task-1");
    expect(parsed?.checkpoint.phase).toBe("model_boundary");
    expect(parseClaimedRunResume([row({ resume_lease_token: null })])).toBeNull();
    expect(parseClaimedRunResume([row({ checkpoint_state: { ...checkpoint, safe_to_resume: false } })])).toBeNull();
  });

  it("claims through the service-role RPC with a bounded lease", async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> | undefined }> = [];
    const sb = {
      rpc: async (fn: string, args?: Record<string, unknown>) => {
        calls.push({ fn, args });
        return { data: [row()], error: null };
      },
    };
    const result = await claimResumableRun({
      sb,
      staleBefore: new Date("2026-08-26T22:30:00.000Z"),
      leaseSeconds: 9999,
    });
    expect(result?.leaseToken).toBe("lease-1");
    expect(calls[0]?.fn).toBe("claim_resumable_agent_task");
    expect(calls[0]?.args?.["_lease_seconds"]).toBe(600);
  });

  it("returns null when there is no stale resumable run", async () => {
    const sb = { rpc: async () => ({ data: [], error: null }) };
    await expect(claimResumableRun({ sb, staleBefore: new Date() })).resolves.toBeNull();
  });

  it("releases only the matching lease token and bounds diagnostics", async () => {
    let payload: Record<string, unknown> | undefined;
    const sb = {
      rpc: async (_fn: string, args?: Record<string, unknown>) => {
        payload = args;
        return { data: true, error: null };
      },
    };
    const ok = await releaseRunResumeLease({
      sb,
      taskId: "task-1",
      leaseToken: "lease-1",
      error: "x".repeat(2000),
    });
    expect(ok).toBe(true);
    expect(String(payload?.["_error"])).toHaveLength(1000);
  });
});
