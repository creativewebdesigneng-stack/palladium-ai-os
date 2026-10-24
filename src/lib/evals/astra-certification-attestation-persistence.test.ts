import { describe, expect, it, vi } from 'vitest'
import { persistAstraBenchmarkAttestation } from './astra-certification-attestation-persistence'

const input = {
  runId: 'case-run-1',
  userId: 'owner-1',
  orgId: 'workspace-1',
  metadata: { astra_activation: { server_verified: true } },
}

function makeDb(result: { data: { id: string } | null; error: { message: string } | null }) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  const update = vi.fn().mockReturnValue(chain)
  const from = vi.fn().mockReturnValue({ update })
  return { db: { from }, chain, update, from }
}

describe('Astra attestation is not acknowledged without a persisted exact-scope row', () => {
  it('accepts a matching final write scoped to owner, org, run and completed status', async () => {
    const { db, chain, update, from } = makeDb({ data: { id: input.runId }, error: null })
    await expect(persistAstraBenchmarkAttestation(db, input)).resolves.toBeUndefined()
    expect(from).toHaveBeenCalledWith('model_eval_runs')
    expect(update).toHaveBeenCalledWith({ metadata: input.metadata })
    expect(chain.eq).toHaveBeenCalledWith('id', input.runId)
    expect(chain.eq).toHaveBeenCalledWith('user_id', input.userId)
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed')
    expect(chain.eq).toHaveBeenCalledWith('org_id', input.orgId)
    expect(chain.select).toHaveBeenCalledWith('id')
    expect(chain.maybeSingle).toHaveBeenCalledOnce()
  })

  it('requires explicit null-organisation isolation for personal evidence', async () => {
    const { db, chain } = makeDb({ data: { id: input.runId }, error: null })
    await persistAstraBenchmarkAttestation(db, { ...input, orgId: null })
    expect(chain.is).toHaveBeenCalledWith('org_id', null)
    expect(chain.eq).not.toHaveBeenCalledWith('org_id', input.orgId)
  })

  it('rejects zero matched rows, switched identity, or a database failure', async () => {
    for (const result of [
      { data: null, error: null },
      { data: { id: 'other-run' }, error: null },
      { data: null, error: { message: 'Database failed' } },
    ]) {
      const { db, chain } = makeDb(result)
      await expect(persistAstraBenchmarkAttestation(db, input)).rejects.toThrow()
      expect(chain.select).toHaveBeenCalledWith('id')
      expect(chain.maybeSingle).toHaveBeenCalledOnce()
    }
  })
})
