import { describe, expect, it } from 'vitest'
import {
  astraCertificationStageError,
  readAstraCertificationFailureStage,
  safeAstraCertificationStageFailure,
} from '../astra-certification-stage-diagnostics'

describe('Astra certification candidate transport diagnostics', () => {
  it('round-trips bounded candidate transport stages', () => {
    for (const stage of [
      'candidate_timeout_or_unreachable',
      'candidate_generation_timeout',
      'candidate_credentials_rejected',
      'candidate_rate_limited',
      'candidate_upstream_unavailable',
    ] as const) {
      expect(readAstraCertificationFailureStage(astraCertificationStageError(stage))).toBe(stage)
      expect(safeAstraCertificationStageFailure(stage).code).toContain('candidate_')
    }
  })

  it('reports a healthy-route generation timeout without weakening the certification window', () => {
    expect(safeAstraCertificationStageFailure('candidate_generation_timeout')).toEqual({
      code: 'candidate_generation_timeout',
      message: 'The native Astra route and bounded chat probe are healthy, but Qwen did not complete the full trusted case within the pinned 60-second certification window.',
    })
  })

  it('does not parse arbitrary exception text as a trusted diagnostic stage', () => {
    expect(readAstraCertificationFailureStage(new Error('Bearer secret leaked'))).toBeNull()
  })
})
