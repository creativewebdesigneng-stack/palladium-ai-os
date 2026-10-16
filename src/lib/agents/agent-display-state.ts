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
