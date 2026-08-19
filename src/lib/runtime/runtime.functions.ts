/**
 * Agent runtime API (typed RPC). Every function is authenticated; the caller's
 * identity comes from the verified bearer token, never from request data.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EntitlementError } from "@/lib/platform/entitlements.server";
import { failRun, prepareRun, RuntimeError } from "./runtime.server";
import { executePlannedRun } from "./planner-runtime.server";
import { TOOL_SLUGS } from "./tools.server";

type Sb = { from: (t: string) => any };

function surface(error: unknown): never {
  if (error instanceof RuntimeError) throw new Error(error.message);
  if (error instanceof EntitlementError) throw new Error(error.message);
  console.error("[runtime.api]", error);
  throw new Error(error instanceof Error ? error.message : "The agent runtime is unavailable.");
}

/** Runs an agent task end to end and returns the finished task row. */
export const runAgentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agent_id: string; input: string }) => {
    if (!input?.agent_id) throw new Error("An agent is required.");
    return { agent_id: String(input.agent_id), input: String(input.input ?? "") };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let run: Awaited<ReturnType<typeof prepareRun>> | null = null;
    try {
      run = await prepareRun({
        sb,
        userId: context.userId,
        agentId: data.agent_id,
        input: data.input,
      });
      const task = await executePlannedRun({ sb, userId: context.userId, run });
      return { task, output: (task as any)?.output_text ?? "" };
    } catch (error) {
      if (run) await failRun({ userId: context.userId, run, error });
      surface(error);
    }
  });

/** Cancels a run. The runtime notices between turns and closes the task. */
export const cancelAgentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { task_id: string }) => ({ task_id: String(input?.task_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: task } = await sb
      .from("agent_tasks")
      .update({
        status: "cancelled",
        cancel_requested: true,
        completed_at: new Date().toISOString(),
        error: "Cancelled by the operator.",
      })
      .eq("id", data.task_id)
      .in("status", ["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"])
      .select("*")
      .maybeSingle();
    return { task: task ?? null };
  });

/** Agent + recent runs + the tools this workspace can grant. */
export const getAgentRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agent_id: string }) => ({ agent_id: String(input?.agent_id ?? "") }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: agent }, { data: tasks }] = await Promise.all([
      sb.from("personal_agents").select("*").eq("id", data.agent_id).maybeSingle(),
      sb
        .from("agent_tasks")
        .select("*")
        .eq("agent_id", data.agent_id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    if (!agent) throw new Error("Agent not found or you do not have access to it.");
    return { agent, tasks: tasks ?? [], availableTools: TOOL_SLUGS };
  });

/** Closes any run of the caller's that has been stuck beyond the timeout. */
export const reapStuckRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("reap_stale_agent_tasks", {
      _user: context.userId,
    } as never);
    return { reaped: Number(data ?? 0) };
  });
