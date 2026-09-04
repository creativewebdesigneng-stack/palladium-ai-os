import { describe, expect, it } from 'vitest'
import { buildAutonomousRunProvenance } from '../autonomous-provenance.functions'
import { verifyProvenanceChain } from '@/lib/ai-hub/provenance'

const events = [
  {
    id: '00000000-0000-4000-8000-000000000002',
    user_id: 'user-1',
    event_type: 'workflow_queued',
    severity: 'info',
    message: 'Workflow queued.',
    payload: { workflow_run_id: 'run-2' },
    created_at: '2026-09-04T12:00:02.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: 'user-1',
    event_type: 'planning_started',
    severity: 'info',
    message: 'Planning started.',
    payload: {},
    created_at: '2026-09-04T12:00:01.000Z',
  },
]

describe('Blackstar autonomous run provenance', () => {
  it('builds a deterministic chronological provenance chain from runtime events', () => {
    const chain = buildAutonomousRunProvenance(events)

    expect(chain.map((event) => event.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ])
    expect(chain[1]?.previousHash).toBe(chain[0]?.hash)
    expect(chain[1]?.parentIds).toEqual([chain[0]?.id])
    expect(verifyProvenanceChain(chain)).toEqual({ valid: true })
  })

  it('produces the same hashes for the same persisted audit history', () => {
    expect(buildAutonomousRunProvenance(events)).toEqual(buildAutonomousRunProvenance([...events].reverse()))
  })

  it('detects tampering after the chain is constructed', () => {
    const chain = buildAutonomousRunProvenance(events)
    const tampered = chain.map((event) => ({ ...event }))
    tampered[1]!.reason = 'Changed after execution.'

    expect(verifyProvenanceChain(tampered)).toEqual({
      valid: false,
      brokenAt: '00000000-0000-4000-8000-000000000002',
    })
  })
})
