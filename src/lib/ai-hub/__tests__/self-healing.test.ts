import { describe, expect, it } from 'vitest'
import { decideRecovery } from '../self-healing'

describe('Blackstar Self-Healing Runtime', () => {
  it('retries transient failures within a bounded budget', () => {
    expect(decideRecovery({ id: 'a', failureClass: 'transient', attempt: 0 }).action).toBe('retry')
    expect(decideRecovery({ id: 'a', failureClass: 'transient', attempt: 2 }).action).toBe('fail_closed')
  })

  it('reroutes dependency failures when an alternative exists', () => {
    const result = decideRecovery({ id: 'b', failureClass: 'dependency', attempt: 3, providerAlternatives: 1 })
    expect(result).toMatchObject({ action: 'reroute', automatic: true })
  })

  it('never automatically heals a policy violation', () => {
    const result = decideRecovery({ id: 'c', failureClass: 'policy', attempt: 0, checkpointAvailable: true })
    expect(result).toMatchObject({ action: 'fail_closed', automatic: false })
  })

  it('rolls back mutations only when a safe checkpoint exists', () => {
    expect(decideRecovery({ id: 'd', failureClass: 'data', attempt: 1, mutationOccurred: true, checkpointAvailable: true }).action).toBe('rollback')
    expect(decideRecovery({ id: 'e', failureClass: 'data', attempt: 1, mutationOccurred: true }).action).toBe('pause_for_approval')
  })
})
