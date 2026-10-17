import { describe, expect, it } from "vitest";
import { cancelOwnedAgentTask } from "../agent-cancellation.server";
import { createFakeSupabase } from "./fake-supabase";

describe("owner-bound cancellation receipts", () => {
  it.each(["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"])("cancels an owned %s task", async status => {
    const sb = createFakeSupabase({ agent_tasks: [{ id: "task", user_id: "owner", status }] });
    const result = await cancelOwnedAgentTask(sb, "owner", "task");
    expect(result.task).toMatchObject({ id: "task", status: "cancelled", cancel_requested: true });
  });

  it.each(["succeeded", "failed", "cancelled"])("returns the existing %s receipt without overwriting history", async status => {
    const saved = { id: "task", user_id: "owner", status, completed_at: "original", output_text: "saved", cancel_requested: status === "cancelled" };
    const sb = createFakeSupabase({ agent_tasks: [saved] });
    expect((await cancelOwnedAgentTask(sb, "owner", "task")).task).toEqual(saved);
  });

  it("does not disclose or cancel another owner's task", async () => {
    const sb = createFakeSupabase({ agent_tasks: [{ id: "task", user_id: "other", status: "running" }] });
    await expect(cancelOwnedAgentTask(sb, "owner", "task")).rejects.toThrow("Could not verify");
    expect(sb.tables['agent_tasks']?.[0]?.['status']).toBe("running");
  });
});
