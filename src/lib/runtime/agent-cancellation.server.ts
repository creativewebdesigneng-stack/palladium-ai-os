type Sb = { from: (table: string) => any };

/** Use the authenticated owner's client; terminal runs are never rewritten. */
export async function cancelOwnedAgentTask(sb: Sb, userId: string, taskId: string) {
  const result = await sb.from("agent_tasks").update({
    status: "cancelled",
    cancel_requested: true,
    completed_at: new Date().toISOString(),
    error: "Cancelled by the operator.",
  }).eq("id", taskId).eq("user_id", userId)
    .in("status", ["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"])
    .select("*").maybeSingle();
  if (result.error) throw new Error("Could not cancel the agent task.");
  if (result.data) return { task: result.data };

  // Completion may win the race. Return its real receipt instead of claiming
  // cancellation from a successful HTTP response with no updated row.
  const current = await sb.from("agent_tasks").select("*")
    .eq("id", taskId).eq("user_id", userId).maybeSingle();
  if (current.error || !current.data) throw new Error("Could not verify the agent task status.");
  return { task: current.data };
}
