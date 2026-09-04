import { describe, expect, it } from 'vitest'
import { appendProvenanceEvent, createProvenanceEvent, traceProvenance, verifyProvenanceChain } from '../provenance'

describe('Blackstar Provenance Chain', () => {
  it('builds and verifies a linked decision chain', () => {
    let chain = appendProvenanceEvent([], {
      id: 'goal', actorId: 'human-1', actorType: 'human', action: 'set_goal', reason: 'launch campaign', timestamp: '2026-09-04T18:00:00Z',
    })
    chain = appendProvenanceEvent(chain, {
      id: 'plan', actorId: 'agent-1', actorType: 'agent', action: 'compile_plan', reason: 'satisfy goal', timestamp: '2026-09-04T18:00:01Z', parentIds: ['goal'], evidence: ['brief'],
    })
    expect(verifyProvenanceChain(chain)).toEqual({ valid: true })
    expect(chain[1]?.previousHash).toBe(chain[0]?.hash)
  })

  it('detects tampering', () => {
    const event = createProvenanceEvent({
      id: 'x', actorId: 'agent-1', actorType: 'agent', action: 'act', reason: 'reason', timestamp: '2026-09-04T18:00:00Z',
    })
    const tampered = [{ ...event, reason: 'changed' }]
    expect(verifyProvenanceChain(tampered)).toEqual({ valid: false, brokenAt: 'x' })
  })

  it('traces causal parents in dependency order', () => {
    const a = createProvenanceEvent({ id: 'a', actorId: 'h', actorType: 'human', action: 'goal', reason: 'r', timestamp: '2026-09-04T18:00:00Z' })
    const b = createProvenanceEvent({ id: 'b', actorId: 'a1', actorType: 'agent', action: 'plan', reason: 'r', timestamp: '2026-09-04T18:00:01Z', parentIds: ['a'] })
    const c = createProvenanceEvent({ id: 'c', actorId: 'a2', actorType: 'agent', action: 'execute', reason: 'r', timestamp: '2026-09-04T18:00:02Z', parentIds: ['b'] })
    expect(traceProvenance([a, b, c], 'c').map((event) => event.id)).toEqual(['a', 'b', 'c'])
  })

  it('rejects invalid event identity or timestamps', () => {
    expect(() => createProvenanceEvent({ id: '', actorId: 'a', actorType: 'agent', action: 'x', reason: 'r', timestamp: '2026-09-04T18:00:00Z' })).toThrow()
    expect(() => createProvenanceEvent({ id: 'x', actorId: 'a', actorType: 'agent', action: 'x', reason: 'r', timestamp: 'not-a-date' })).toThrow()
  })
})
