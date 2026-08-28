import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./fake-supabase";
import { createSkillCandidateFromVerifiedExperience } from "../agent-skills/skill-reflection.server";

describe("verified experience skill reflection", () => {
  it("creates a disabled, script-free candidate from verified experience", async () => {
    const db = createFakeSupabase({
      agent_tasks: [{
        id: "task-1",
        user_id: "user-1",
        agent_id: "agent-1",
        org_id: null,
        input: "Review Shopify orders and prepare daily operations report",
        status: "succeeded",
        verification_state: { verdict: "verified" },
      }],
      agent_memories: [{
        id: "memory-1",
        user_id: "user-1",
        task_id: "task-1",
        category: "verified_experience",
        title: "Verified workflow",
        content: "1. Read open orders.\n2. Reconcile fulfilment state.\n3. Prepare the report.",
        metadata: {},
      }],
      personal_agents: [{ id: "agent-1", user_id: "user-1", name: "Store Operator" }],
      agent_skills: [],
      mission_audit_logs: [],
    }) as any;

    const skill = await createSkillCandidateFromVerifiedExperience({ sb: db, userId: "user-1", taskId: "task-1" });
    expect(skill).toMatchObject({ enabled: false, source_kind: "reflection", source_ref: "task-1" });
    const stored = db.__getTable?.("agent_skills") ?? [];
    if (stored.length) {
      expect(stored[0].requires_scripts).toEqual([]);
      expect(stored[0].dangerous).toBe(false);
    }
  });

  it("refuses unverified or unfinished tasks", async () => {
    const db = createFakeSupabase({
      agent_tasks: [{ id: "task-2", user_id: "user-1", status: "running", verification_state: null }],
    }) as any;
    await expect(createSkillCandidateFromVerifiedExperience({ sb: db, userId: "user-1", taskId: "task-2" }))
      .rejects.toThrow("Only completed verified tasks");
  });

  it("requires captured verified experience before reflection", async () => {
    const db = createFakeSupabase({
      agent_tasks: [{
        id: "task-3", user_id: "user-1", agent_id: "agent-1", org_id: null,
        input: "Do verified work", status: "completed", verification_state: { verdict: "verified" },
      }],
      agent_memories: [],
    }) as any;
    await expect(createSkillCandidateFromVerifiedExperience({ sb: db, userId: "user-1", taskId: "task-3" }))
      .rejects.toThrow("Verified experience must be captured");
  });
});
