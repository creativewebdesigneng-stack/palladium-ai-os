import { describe, expect, it } from 'vitest'
import { candidateFailureStage, readAstraCertificationFailureStage } from './astra-certification-stage-diagnostics'

describe('Astra certification stage diagnostics', () => {
  it('classifies cross-bundle shaped provider errors by bounded status', () => {
    expect(candidateFailureStage({ status: 504, message: 'hidden' })).toBe('candidate_timeout_or_unreachable')
    expect(candidateFailureStage({ status: 408 })).toBe('candidate_timeout_or_unreachable')
    expect(candidateFailureStage({ status: 401 })).toBe('candidate_credentials_rejected')
    expect(candidateFailureStage({ status: 403 })).toBe('candidate_credentials_rejected')
    expect(candidateFailureStage({ status: 429 })).toBe('candidate_rate_limited')
    expect(candidateFailureStage({ status: 502 })).toBe('candidate_upstream_unavailable')
    expect(candidateFailureStage({ status: 503 })).toBe('candidate_upstream_unavailable')
  })

  it('fails closed for unknown or malformed provider errors', () => {
    expect(candidateFailureStage(null)).toBe('candidate_execution')
    expect(candidateFailureStage(new Error('arbitrary secret-bearing text'))).toBe('candidate_execution')
    expect(candidateFailureStage({ status: '504' })).toBe('candidate_execution')
    expect(candidateFailureStage({ status: 500 })).toBe('candidate_execution')
  })

  it('accepts only Blackstar stage markers for user-visible classification', () => {
    expect(readAstraCertificationFailureStage(new Error('BLACKSTAR_ASTRA_CERT_STAGE:candidate_timeout_or_unreachable')))
      .toBe('candidate_timeout_or_unreachable')
    expect(readAstraCertificationFailureStage(new Error('arbitrary provider error with token=secret'))).toBeNull()
  })
})
