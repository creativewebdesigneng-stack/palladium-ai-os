/** A failed history read is never equivalent to a genuinely empty task queue. */
type ReadResult<T> = {
  data: T | null;
  error?: { message?: string } | null;
};

export function resolveAgentRuntimeSnapshot<Agent, Task>(
  agentResult: ReadResult<Agent>,
  taskResult: ReadResult<Task[]>,
): { agent: Agent; tasks: Task[] } {
  if (agentResult.error) throw new Error("Could not load agent configuration.");
  if (!agentResult.data) {
    throw new Error("Agent not found or you do not have access to it.");
  }
  if (taskResult.error) throw new Error("Could not load agent task history.");
  return { agent: agentResult.data, tasks: taskResult.data ?? [] };
}
