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
      'candidate_credentials_rejected',
      'candidate_rate_limited',
      'candidate_upstream_unavailable',
    ] as const) {
      expect(readAstraCertificationFailureStage(astraCertificationStageError(stage))).toBe(stage)
      expect(safeAstraCertificationStageFailure(stage).code).toContain('candidate_')
    }
  })

  it('does not parse arbitrary exception text as a trusted diagnostic stage', () => {
    expect(readAstraCertificationFailureStage(new Error('Bearer secret leaked'))).toBeNull()
  })
})
