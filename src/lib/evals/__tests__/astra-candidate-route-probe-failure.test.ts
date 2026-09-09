import { describe, expect, it } from 'vitest'
import { classifyAstraCandidateProbeFailure } from '../astra-candidate-route-probe-failure'

describe('Astra candidate route probe failure classification', () => {
  it('preserves a nested connection-refused cause instead of collapsing it to network unreachable', () => {
    const error = new TypeError('fetch failed', { cause: Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' }) })
    expect(classifyAstraCandidateProbeFailure(error)).toBe('candidate_connection_refused')
  })

  it('preserves nested reset and timeout transport causes', () => {
    const reset = new Error('fetch failed', { cause: Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }) })
    const timeout = new Error('fetch failed', { cause: Object.assign(new Error('connect timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) })
    expect(classifyAstraCandidateProbeFailure(reset)).toBe('candidate_connection_reset')
    expect(classifyAstraCandidateProbeFailure(timeout)).toBe('candidate_timeout_or_unreachable')
  })

  it('treats the probe-owned AbortError as a bounded probe timeout', () => {
    const aborted = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
    expect(classifyAstraCandidateProbeFailure(aborted)).toBe('candidate_timeout_or_unreachable')
  })

  it('keeps DNS and host-unreachable failures safely bounded', () => {
    for (const code of ['ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH']) {
      const error = new Error('fetch failed', { cause: Object.assign(new Error('unreachable'), { code }) })
      expect(classifyAstraCandidateProbeFailure(error)).toBe('candidate_network_unreachable')
    }
  })
})
