/**
 * Persist a signed Astra benchmark attestation through the existing owner
 * scoped model_eval_runs table. A zero-row update must never be acknowledged
 * as a verified benchmark case, even when PostgREST reports no error.
 */
export async function persistAstraBenchmarkAttestation(
  db: { from: (table: string) => any },
  input: {
    runId: string
    userId: string
    orgId: string | null
    metadata: Record<string, unknown>
  },
): Promise<void> {
  let update = db.from('model_eval_runs').update({ metadata: input.metadata })
    .eq('id', input.runId)
    .eq('user_id', input.userId)
    .eq('status', 'completed')
  update = input.orgId ? update.eq('org_id', input.orgId) : update.is('org_id', null)
  const { data: persisted, error } = await update.select('id').maybeSingle()
  if (error) throw new Error(error.message)
  if (persisted?.id !== input.runId) {
    throw new Error('Astra attestation was not persisted for the exact authorized run.')
  }
}
