/** Display persisted configuration without inventing execution or performance evidence. */
export function agentDisplayState(agent: {
  memory_enabled?: boolean | null;
  last_run_at?: string | null;
  preferences?: Record<string, unknown> | null;
}) {
  const score = agent.preferences?.['score'];
  return {
    // Match the existing runtime/writer default; preferences.memory is a wizard object.
    memory: agent.memory_enabled !== false,
    lastRunAt: agent.last_run_at && Number.isFinite(Date.parse(agent.last_run_at))
      ? agent.last_run_at : null,
    score: typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100
      ? score : null,
  };
}

/** Current execution is distinct from queued work and operator approval waits. */
export function agentRuntimeStates(rows: Array<{ agent_id?: string | null; status?: string | null }>) {
  const priority: Record<string, number> = { running: 4, queued: 3, waiting_for_approval: 2, awaiting_approval: 1 };
  const states = new Map<string, string>();
  for (const row of rows) {
    if (!row.agent_id || !row.status || typeof priority[row.status] !== 'number') continue;
    const previous = states.get(row.agent_id);
    if (!previous || priority[row.status]! > priority[previous]!) states.set(row.agent_id, row.status);
  }
  return states;
}
