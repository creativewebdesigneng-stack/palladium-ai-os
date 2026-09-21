/** A failed or indeterminate history read must never appear as an empty task queue. */
export type RuntimeReadResult<T> = {
  data: T | null;
  error?: { message?: string } | null;
};

export function resolveAgentRuntimeSnapshot<Agent, Task>(
  agentResult: RuntimeReadResult<Agent>,
  taskResult: RuntimeReadResult<Task[]>,
): { agent: Agent; tasks: Task[] } {
  if (agentResult.error) throw new Error("Could not load agent configuration.");
  if (!agentResult.data) {
    throw new Error("Agent not found or you do not have access to it.");
  }
  if (taskResult.error || !Array.isArray(taskResult.data)) {
    throw new Error("Could not load agent task history.");
  }
  return { agent: agentResult.data, tasks: taskResult.data };
}
