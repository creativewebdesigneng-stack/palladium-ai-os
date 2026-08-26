import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const resume = vi.hoisted(() => ({ claim: vi.fn(), release: vi.fn() }));
vi.mock("../run-resume.server", () => ({
  claimResumableRun: resume.claim,
  releaseRunResumeLease: resume.release,
}));

const planner = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("../planner-runtime.server", () => ({ executePlannedRun: planner.execute }));

const runtime = vi.hoisted(() => ({
  fail: vi.fn(),
  setState: vi.fn(async () => {}),
}));
vi.mock("../runtime.server", () => ({
  failRun: runtime.fail,
  setRunState: runtime.setState,
  RuntimeError: class RuntimeError extends Error {
    constructor(
      message: string,
      readonly code: string,
      readonly status = 400,
    ) {
      super(message);
    }
  },
}));

const checkpointMod = vi.hoisted(() => ({ invalidate: vi.fn(), parse: vi.fn() }));
vi.mock("../run-checkpoint.server", () => ({
  invalidateDurableRunCheckpoint: checkpointMod.invalidate,
  parseDurableRunCheckpoint: checkpointMod.parse,
}));

vi.mock("@/lib/platform/entitlements.server", () => ({
  getEntitlements: vi.fn(async () => ({ planCode: "builder" })),
}));
vi.mock("../tools.server", () => ({
  resolveGrantedTools: vi.fn(async () => ({ defs: [], grants: new Map() })),
}));
vi.mock("../model-gateway.server", () => ({
  normaliseProvider: (value: string | null) => value || "openai",
  resolveModel: (_provider: string, model: string | null) => model || "gpt-test",
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

import { resumeOneStaleAgentRun } from "../run-resume-worker.server";

const checkpoint = {
  schema: 1,
  phase: "model_boundary",
  safe_to_resume: true,
  saved_at: "2026-08-26T22:00:00.000Z",
  messages: [{ role: "user", content: "continue" }],
  plan: { objective: "continue", steps: [], replan_count: 0, max_replans: 2 },
  tool_rounds: 1,
  tool_call_count: 2,
  usage: { input: 10, output: 4 },
};

function claim(resumeCount = 1) {
  return {
    taskId: "task-1",
    userId: "user-1",
    agentId: "agent-1",
    orgId: null,
    provider: "openai",
    model: "gpt-test",
    leaseToken: "lease-1",
    resumeCount,
    checkpoint,
  };
}

function db(checkpointState: unknown = checkpoint) {
  return createFakeSupabase({
    personal_agents: [{
      id: "agent-1",
      user_id: "user-1",
      org_id: null,
      org_id_fk: null,
      status: "active",
      model_provider: "openai",
      model: "gpt-test",
      allowed_tools: [],
      allowed_providers: [],
      name: "Atlas",
    }],
    agent_tasks: [{ id: "task-1", status: "running", checkpoint_state: checkpointState }],
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  resume.release.mockResolvedValue(true);
  checkpointMod.invalidate.mockResolvedValue(undefined);
  checkpointMod.parse.mockImplementation((value: unknown) => value ? checkpoint : null);
});

describe("durable run resume worker", () => {
  it("resumes the same task from its checkpoint and releases the lease", async () => {
    const sb = db();
    resume.claim.mockResolvedValue(claim());
    planner.execute.mockResolvedValue({ id: "task-1", status: "succeeded" });

    await expect(resumeOneStaleAgentRun({ sb })).resolves.toBe("resumed");

    expect(runtime.setState).toHaveBeenCalledWith(sb, "task-1", "running");
    expect(planner.execute).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      resumeCheckpoint: checkpoint,
      run: expect.objectContaining({ taskId: "task-1" }),
    }));
    expect(checkpointMod.invalidate).toHaveBeenCalledWith({ sb, taskId: "task-1" });
    expect(resume.release).toHaveBeenCalledWith({ sb, taskId: "task-1", leaseToken: "lease-1" });
  });

  it("leaves a safe checkpoint retryable after an early resume failure", async () => {
    const sb = db(checkpoint);
    resume.claim.mockResolvedValue(claim(1));
    planner.execute.mockRejectedValue(new Error("model temporarily unavailable"));

    await expect(resumeOneStaleAgentRun({ sb })).resolves.toBe("retryable_failure");
    expect(runtime.fail).not.toHaveBeenCalled();
    expect(resume.release).toHaveBeenCalledWith(expect.objectContaining({
      taskId: "task-1",
      leaseToken: "lease-1",
      error: "model temporarily unavailable",
    }));
  });

  it("fails closed when the checkpoint disappeared during tool execution", async () => {
    const sb = db(null);
    resume.claim.mockResolvedValue(claim(1));
    planner.execute.mockRejectedValue(new Error("worker died after dispatch"));

    await expect(resumeOneStaleAgentRun({ sb })).resolves.toBe("failed");
    expect(runtime.fail).toHaveBeenCalledTimes(1);
  });

  it("stops retrying after the third automatic resume attempt", async () => {
    const sb = db(checkpoint);
    resume.claim.mockResolvedValue(claim(3));
    planner.execute.mockRejectedValue(new Error("still unavailable"));

    await expect(resumeOneStaleAgentRun({ sb })).resolves.toBe("failed");
    expect(runtime.fail).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no stale resumable task can be claimed", async () => {
    const sb = db();
    resume.claim.mockResolvedValue(null);
    await expect(resumeOneStaleAgentRun({ sb })).resolves.toBe("none");
    expect(planner.execute).not.toHaveBeenCalled();
  });
});
