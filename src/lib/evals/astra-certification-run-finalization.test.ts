import { describe, expect, it, vi } from 'vitest'
import { finalizeAstraCertificationRun } from './astra-certification-run-finalization'

const input = {
  runId: 'run-1',
  userId: 'owner-1',
  orgId: 'workspace-1',
  judgeProvider: 'freellm',
  judgeModel: 'pinned-independent-judge',
  metadata: { astra_activation: { server_verified: true } },
  completedAt: '2026-10-23T16:00:00Z',
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

describe('Astra run completion requires a persisted exact-owner receipt', () => {
  it('finalizes only the matching running run and returns on exact receipt', async () => {
    const { db, chain, update, from } = makeDb({ data: { id: input.runId }, error: null })
    await expect(finalizeAstraCertificationRun(db, input)).resolves.toBeUndefined()
    expect(from).toHaveBeenCalledWith('model_eval_runs')
    expect(update).toHaveBeenCalledWith({
      status: 'completed', completed_at: input.completedAt,
      judge_provider: input.judgeProvider, judge_model: input.judgeModel,
      metadata: input.metadata,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', input.runId)
    expect(chain.eq).toHaveBeenCalledWith('user_id', input.userId)
    expect(chain.eq).toHaveBeenCalledWith('status', 'running')
    expect(chain.eq).toHaveBeenCalledWith('org_id', input.orgId)
    expect(chain.select).toHaveBeenCalledWith('id')
  })

  it('isolates a personal run from all organisation-owned runs', async () => {
    const { db, chain } = makeDb({ data: { id: input.runId }, error: null })
    await finalizeAstraCertificationRun(db, { ...input, orgId: null })
    expect(chain.is).toHaveBeenCalledWith('org_id', null)
  })

  it('refuses zero-row, incorrect-run and database-error completions', async () => {
    for (const result of [
      { data: null, error: null },
      { data: { id: 'another-run' }, error: null },
      { data: null, error: { message: 'connection failed' } },
    ]) {
      const { db } = makeDb(result)
      await expect(finalizeAstraCertificationRun(db, input)).rejects.toThrow(/finalization was not persisted/)
    }
  })
})
