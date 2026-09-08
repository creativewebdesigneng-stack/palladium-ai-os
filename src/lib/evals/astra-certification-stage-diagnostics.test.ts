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

  it('classifies successful-response parse and shape failures without exposing text', () => {
    expect(candidateFailureStage({ name: 'SyntaxError', message: 'secret body contents' }))
      .toBe('candidate_response_invalid_json')
    expect(candidateFailureStage({ name: 'TypeError', message: 'secret object contents' }))
      .toBe('candidate_response_shape_invalid')
  })

  it('classifies safe network and runtime identities', () => {
    expect(candidateFailureStage({ code: 'ECONNREFUSED' })).toBe('candidate_connection_refused')
    expect(candidateFailureStage({ code: 'ECONNRESET' })).toBe('candidate_connection_reset')
    expect(candidateFailureStage({ code: 'UND_ERR_SOCKET' })).toBe('candidate_connection_reset')
    expect(candidateFailureStage({ code: 'ENETUNREACH' })).toBe('candidate_network_unreachable')
    expect(candidateFailureStage({ code: 'EHOSTUNREACH' })).toBe('candidate_network_unreachable')
    expect(candidateFailureStage({ code: 'ENOTFOUND' })).toBe('candidate_network_unreachable')
    expect(candidateFailureStage({ code: 'ETIMEDOUT' })).toBe('candidate_timeout_or_unreachable')
    expect(candidateFailureStage({ code: 'UND_ERR_CONNECT_TIMEOUT' })).toBe('candidate_timeout_or_unreachable')
    expect(candidateFailureStage({ name: 'TimeoutError' })).toBe('candidate_timeout_or_unreachable')
    expect(candidateFailureStage({ name: 'AbortError' })).toBe('candidate_aborted')
  })

  it('walks a bounded cause chain and ignores raw error messages', () => {
    expect(candidateFailureStage({
      name: 'Error',
      message: 'fetch failed with hidden endpoint',
      cause: { code: 'ECONNREFUSED', message: 'hidden localhost details' },
    })).toBe('candidate_connection_refused')
    const loop: { cause?: unknown } = {}
    loop.cause = loop
    expect(candidateFailureStage(loop)).toBe('candidate_runtime_unknown_object')
  })

  it('returns a safe fingerprint for previously generic failures', () => {
    expect(candidateFailureStage(new Error('arbitrary secret-bearing text'))).toBe('candidate_runtime_error_object')
    expect(candidateFailureStage({ name: 'RangeError', message: 'hidden' })).toBe('candidate_runtime_range_error')
    expect(candidateFailureStage({ name: 'AggregateError', message: 'hidden' })).toBe('candidate_runtime_aggregate_error')
    expect(candidateFailureStage({ status: '504' })).toBe('candidate_runtime_unknown_object')
    expect(candidateFailureStage({ status: 500 })).toBe('candidate_runtime_unknown_object')
    expect(candidateFailureStage(null)).toBe('candidate_runtime_non_error')
    expect(candidateFailureStage('hidden thrown string')).toBe('candidate_runtime_non_error')
  })

  it('accepts only Blackstar stage markers for user-visible classification', () => {
    expect(readAstraCertificationFailureStage(new Error('BLACKSTAR_ASTRA_CERT_STAGE:candidate_timeout_or_unreachable')))
      .toBe('candidate_timeout_or_unreachable')
    expect(readAstraCertificationFailureStage(new Error('BLACKSTAR_ASTRA_CERT_STAGE:candidate_connection_refused')))
      .toBe('candidate_connection_refused')
    expect(readAstraCertificationFailureStage(new Error('BLACKSTAR_ASTRA_CERT_STAGE:candidate_runtime_error_object')))
      .toBe('candidate_runtime_error_object')
    expect(readAstraCertificationFailureStage(new Error('arbitrary provider error with token=secret'))).toBeNull()
  })
})
