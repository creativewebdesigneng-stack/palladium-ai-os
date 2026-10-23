/**
 * A late attestation failure must not erase a completed, signed benchmark.
 * Fail only the original owner's still-running evaluation. A zero-row update
 * means it was already finalized, cancelled or transferred; never clobber it.
 */
export async function failAstraCertificationRunIfRunning(
  db: { from: (table: string) => any },
  input: {
    runId: string
    userId: string
    orgId: string | null
    metadata: Record<string, unknown>
    completedAt: string
  },
): Promise<boolean> {
  let query = db.from('model_eval_runs').update({
    status: 'failed',
    completed_at: input.completedAt,
    metadata: input.metadata,
  }).eq('id', input.runId).eq('user_id', input.userId).eq('status', 'running')
  query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new Error('Astra certification run failure state could not be persisted.')
  if (data && data.id !== input.runId) {
    throw new Error('Astra certification failure write returned the wrong run.')
  }
  return data?.id === input.runId
}
