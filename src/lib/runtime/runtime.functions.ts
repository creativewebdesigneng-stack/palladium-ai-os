/**
 * Agent runtime API (typed RPC). Every function is authenticated; the caller's
 * identity comes from the verified bearer token, never from request data.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeAgentTask } from "./agent-task-execution.server";
import { resolveAgentRuntimeSnapshot } from "./runtime-snapshot";
import { TOOL_SLUGS } from "./tools.server";

type Sb = { from: (t: string) => any };

/** Runs an agent task end to end and returns the finished task row. */
export const runAgentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agent_id: string; input: string; artifact_ids?: string[] }) => {
    if (!input?.agent_id) throw new Error("An agent is required.");
    const rawArtifactIds = Array.isArray(input?.artifact_ids) ? input.artifact_ids : [];
    if (rawArtifactIds.length > 4) throw new Error("Attach at most 4 private images to one agent task.");
    const artifactIds = [...new Set(rawArtifactIds.map((value) => String(value ?? "").trim()).filter(Boolean))];
    return {
      agent_id: String(input.agent_id),
      input: String(input.input ?? ""),
      artifact_ids: artifactIds,
    };
  })
  .handler(async ({ data, context }) => {
    return executeAgentTask({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      agentId: data.agent_id,
      input: data.input,
      artifactIds: data.artifact_ids,
    });
  });

/** Cancels a run. The runtime notices between turns and closes the task. */
export const cancelAgentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { task_id: string }) => ({ task_id: String(input?.task_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: task, error: cancellationError } = await sb
      .from("agent_tasks")
      .update({
        status: "cancelled",
        cancel_requested: true,
        completed_at: new Date().toISOString(),
        error: "Cancelled by the operator.",
      })
      .eq("id", data.task_id)
      .eq("user_id", context.userId)
      .in("status", ["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"])
      .select("*")
      .maybeSingle();
    if (cancellationError) throw new Error("Could not cancel the agent task.");
    return { task: task ?? null };
  });

/** Agent + recent runs + the tools this workspace can grant. */
export const getAgentRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agent_id: string }) => ({ agent_id: String(input?.agent_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [agentResult, taskResult] = await Promise.all([
      sb.from("personal_agents").select("*").eq("id", data.agent_id).eq("user_id", context.userId).maybeSingle(),
      sb
        .from("agent_tasks")
        .select("*")
        .eq("agent_id", data.agent_id)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    const snapshot = resolveAgentRuntimeSnapshot(agentResult, taskResult);
    return { ...snapshot, availableTools: TOOL_SLUGS };
  });

/**
 * Legacy user-triggered reaper: retained as an explicit retirement error for
 * older clients. Recovery belongs to the existing scheduler and durable
 * run-resume worker; never expose its service-role authority through this API.
 */
export const reapStuckRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("Manual stale-run reaping has been retired. Agent crash recovery runs through Blackstar's scheduled worker.");
  });
