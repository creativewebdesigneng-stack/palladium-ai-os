/**
 * A successful PostgREST update response does not prove that a row matched.
 * Complete only the exact still-running owner-scoped evaluation and require
 * the returned ID before attesting or counting a benchmark case.
 */
export async function finalizeAstraCertificationRun(
  db: { from: (table: string) => any },
  input: {
    runId: string
    userId: string
    orgId: string | null
    judgeProvider: string
    judgeModel: string
    metadata: Record<string, unknown>
    completedAt: string
  },
): Promise<void> {
  let query = db.from('model_eval_runs').update({
    status: 'completed',
    completed_at: input.completedAt,
    judge_provider: input.judgeProvider,
    judge_model: input.judgeModel,
    metadata: input.metadata,
  }).eq('id', input.runId).eq('user_id', input.userId).eq('status', 'running')
  query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
  const { data, error } = await query.select('id').maybeSingle()
  if (error || data?.id !== input.runId) {
    throw new Error('Astra certification run finalization was not persisted for the exact authorized run.')
  }
}
