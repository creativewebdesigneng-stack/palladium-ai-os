export type AstraTextCertificationStage =
  | 'run_persistence'
  | 'candidate_execution'
  | 'candidate_timeout_or_unreachable'
  | 'candidate_credentials_rejected'
  | 'candidate_rate_limited'
  | 'candidate_upstream_unavailable'
  | 'candidate_response_invalid_json'
  | 'candidate_response_shape_invalid'
  | 'candidate_identity'
  | 'response_persistence'
  | 'evaluator_request'
  | 'evaluator_identity'
  | 'evaluator_route'
  | 'judge_response'
  | 'score_persistence'
  | 'provenance_signing'
  | 'run_finalize'
  | 'attestation'

const STAGE_PREFIX = 'BLACKSTAR_ASTRA_CERT_STAGE:'

export function astraCertificationStageError(stage: AstraTextCertificationStage): Error {
  return new Error(`${STAGE_PREFIX}${stage}`)
}

export function candidateFailureStage(error: unknown): AstraTextCertificationStage {
  if (!error || typeof error !== 'object') return 'candidate_execution'
  const statusValue = (error as { status?: unknown }).status
  const status = typeof statusValue === 'number' && Number.isFinite(statusValue) ? statusValue : null
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 502 || status === 503) return 'candidate_upstream_unavailable'
  if (status === 504 || status === 408) return 'candidate_timeout_or_unreachable'

  const name = typeof (error as { name?: unknown }).name === 'string'
    ? String((error as { name: string }).name)
    : ''
  if (name === 'SyntaxError') return 'candidate_response_invalid_json'
  if (name === 'TypeError') return 'candidate_response_shape_invalid'
  return 'candidate_execution'
}

export function readAstraCertificationFailureStage(error: unknown): AstraTextCertificationStage | null {
  const message = error instanceof Error ? error.message : ''
  if (!message.startsWith(STAGE_PREFIX)) return null
  const stage = message.slice(STAGE_PREFIX.length) as AstraTextCertificationStage
  switch (stage) {
    case 'run_persistence':
    case 'candidate_execution':
    case 'candidate_timeout_or_unreachable':
    case 'candidate_credentials_rejected':
    case 'candidate_rate_limited':
    case 'candidate_upstream_unavailable':
    case 'candidate_response_invalid_json':
    case 'candidate_response_shape_invalid':
    case 'candidate_identity':
    case 'response_persistence':
    case 'evaluator_request':
    case 'evaluator_identity':
    case 'evaluator_route':
    case 'judge_response':
    case 'score_persistence':
    case 'provenance_signing':
    case 'run_finalize':
    case 'attestation':
      return stage
    default:
      return null
  }
}

export function safeAstraCertificationStageFailure(stage: AstraTextCertificationStage) {
  switch (stage) {
    case 'run_persistence':
      return { code: 'run_persistence_failed', message: 'Blackstar could not create the trusted certification run record.' } as const
    case 'candidate_execution':
      return { code: 'candidate_execution_failed', message: 'The native Astra candidate runtime failed while executing this trusted case.' } as const
    case 'candidate_timeout_or_unreachable':
      return { code: 'candidate_timeout_or_unreachable', message: 'The native Astra endpoint did not complete the trusted case within the pinned transport window. The local Qwen bridge may be unreachable or the model may be taking longer than the certification timeout.' } as const
    case 'candidate_credentials_rejected':
      return { code: 'candidate_credentials_rejected', message: 'The native Astra endpoint rejected Blackstar runtime authentication. The configured native bridge credential must be rotated or corrected before certification can continue.' } as const
    case 'candidate_rate_limited':
      return { code: 'candidate_rate_limited', message: 'The native Astra endpoint rate limited this certification request.' } as const
    case 'candidate_upstream_unavailable':
      return { code: 'candidate_upstream_unavailable', message: 'The native Astra bridge responded, but its local model upstream was unavailable while executing this trusted case.' } as const
    case 'candidate_response_invalid_json':
      return { code: 'candidate_response_invalid_json', message: 'The native Astra endpoint returned a successful HTTP response that was not valid JSON. The local Qwen bridge or upstream response format must be corrected before certification can continue.' } as const
    case 'candidate_response_shape_invalid':
      return { code: 'candidate_response_shape_invalid', message: 'The native Astra endpoint returned JSON that did not match the OpenAI-compatible response shape required by Blackstar certification.' } as const
    case 'candidate_identity':
      return { code: 'candidate_identity_mismatch', message: 'The Astra candidate runtime changed identity during certification.' } as const
    case 'response_persistence':
      return { code: 'response_persistence_failed', message: 'Blackstar could not persist the Astra candidate response for certification.' } as const
    case 'evaluator_request':
      return { code: 'evaluator_request_failed', message: 'The independent evaluator failed while scoring this certification case.' } as const
    case 'evaluator_identity':
      return { code: 'evaluator_identity_mismatch', message: 'The independent evaluator changed its configured identity during certification.' } as const
    case 'evaluator_route':
      return { code: 'evaluator_route_mismatch', message: 'The independent evaluator route did not match the exact pinned upstream identity.' } as const
    case 'judge_response':
      return { code: 'judge_response_invalid', message: 'The independent evaluator returned a response that could not be accepted as a trusted certification score.' } as const
    case 'score_persistence':
      return { code: 'score_persistence_failed', message: 'Blackstar could not persist the independently judged certification score.' } as const
    case 'provenance_signing':
      return { code: 'provenance_signing_failed', message: 'Blackstar could not sign the trusted certification provenance.' } as const
    case 'run_finalize':
      return { code: 'run_finalize_failed', message: 'The certification evidence was produced but the trusted run could not be finalized.' } as const
    case 'attestation':
      return { code: 'attestation_failed', message: 'The certification run completed, but trusted provenance attestation did not pass.' } as const
  }
}
