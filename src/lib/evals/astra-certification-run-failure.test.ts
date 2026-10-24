import { describe, expect, it, vi } from 'vitest'
import { failAstraCertificationRunIfRunning } from './astra-certification-run-failure'

const input = {
  runId: 'run-1',
  userId: 'owner-1',
  orgId: 'workspace-1',
  metadata: { failure_stage: 'evaluator_request' },
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

describe('Astra failed-run cleanup cannot overwrite completed evidence', () => {
  it('only marks an exact owner/workspace run while its status is running', async () => {
    const { db, chain, update, from } = makeDb({ data: { id: input.runId }, error: null })
    await expect(failAstraCertificationRunIfRunning(db, input)).resolves.toBe(true)
    expect(from).toHaveBeenCalledWith('model_eval_runs')
    expect(update).toHaveBeenCalledWith({
      status: 'failed', completed_at: input.completedAt, metadata: input.metadata,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', input.runId)
    expect(chain.eq).toHaveBeenCalledWith('user_id', input.userId)
    expect(chain.eq).toHaveBeenCalledWith('org_id', input.orgId)
    expect(chain.eq).toHaveBeenCalledWith('status', 'running')
    expect(chain.select).toHaveBeenCalledWith('id')
  })

  it('does not clobber completed or revoked runs when no running row matched', async () => {
    const { db, chain } = makeDb({ data: null, error: null })
    await expect(failAstraCertificationRunIfRunning(db, input)).resolves.toBe(false)
    expect(chain.eq).toHaveBeenCalledWith('status', 'running')
  })

  it('isolates personal runs from organisation-owned records', async () => {
    const { db, chain } = makeDb({ data: { id: input.runId }, error: null })
    await failAstraCertificationRunIfRunning(db, { ...input, orgId: null })
    expect(chain.is).toHaveBeenCalledWith('org_id', null)
  })

  it('rejects incorrect receipts and database failures', async () => {
    for (const result of [
      { data: { id: 'different-run' }, error: null },
      { data: null, error: { message: 'sensitive backend details' } },
    ]) {
      const { db } = makeDb(result)
      await expect(failAstraCertificationRunIfRunning(db, input)).rejects.toThrow(/Astra certification/)
    }
  })
})
