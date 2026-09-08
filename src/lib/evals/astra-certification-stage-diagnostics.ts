export type AstraTextCertificationStage =
  | 'run_persistence'
  | 'candidate_execution'
  | 'candidate_timeout_or_unreachable'
  | 'candidate_connection_refused'
  | 'candidate_connection_reset'
  | 'candidate_network_unreachable'
  | 'candidate_aborted'
  | 'candidate_credentials_rejected'
  | 'candidate_rate_limited'
  | 'candidate_upstream_unavailable'
  | 'candidate_request_rejected'
  | 'candidate_model_or_chat_route_not_found'
  | 'candidate_response_invalid_json'
  | 'candidate_response_shape_invalid'
  | 'candidate_runtime_error_object'
  | 'candidate_route_reachable_runtime_failure'
  | 'candidate_runtime_range_error'
  | 'candidate_runtime_aggregate_error'
  | 'candidate_runtime_unknown_object'
  | 'candidate_runtime_non_error'
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

function classifyKnownRuntimeMessage(message: unknown): AstraTextCertificationStage | null {
  if (typeof message !== 'string') return null
  const normalized = message.trim().toLowerCase()
  if (!normalized) return null

  // Some hosting runtimes strip status/code/cause from fetch failures and leave
  // only a generic Error message. Match only known infrastructure phrases and
  // never return or persist the original message text.
  if (normalized === 'fetch failed' || normalized === 'network request failed') {
    return 'candidate_network_unreachable'
  }
  if (normalized.includes('socket hang up') || normalized.includes('connection reset')) {
    return 'candidate_connection_reset'
  }
  if (
    normalized.includes('getaddrinfo') ||
    normalized.includes('name resolution') ||
    normalized.includes('dns lookup') ||
    normalized.includes('host not found')
  ) {
    return 'candidate_network_unreachable'
  }
  if (
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('deadline exceeded')
  ) {
    return 'candidate_timeout_or_unreachable'
  }
  if (normalized.includes('aborted') || normalized.includes('aborterror')) {
    return 'candidate_aborted'
  }
  return null
}

function classifyCandidateError(error: unknown): AstraTextCertificationStage | null {
  if (!error || typeof error !== 'object') return null

  const value = error as { status?: unknown; name?: unknown; code?: unknown; message?: unknown }
  const status = typeof value.status === 'number' && Number.isFinite(value.status) ? value.status : null
  if (status === 400 || status === 422) return 'candidate_request_rejected'
  if (status === 404) return 'candidate_model_or_chat_route_not_found'
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 502 || status === 503 || (status !== null && status >= 500)) return 'candidate_upstream_unavailable'
  if (status === 504 || status === 408) return 'candidate_timeout_or_unreachable'

  const code = typeof value.code === 'string' ? value.code.toUpperCase() : ''
  if (code === 'ECONNREFUSED') return 'candidate_connection_refused'
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'candidate_connection_reset'
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'ENOTFOUND') return 'candidate_network_unreachable'
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT') {
    return 'candidate_timeout_or_unreachable'
  }

  const messageClass = classifyKnownRuntimeMessage(value.message)
  if (messageClass) return messageClass

  const name = typeof value.name === 'string' ? value.name : ''
  if (name === 'SyntaxError') return 'candidate_response_invalid_json'
  if (name === 'TypeError') return 'candidate_response_shape_invalid'
  if (name === 'AbortError') return 'candidate_aborted'
  if (name === 'TimeoutError') return 'candidate_timeout_or_unreachable'
  return null
}

function unknownCandidateFailureStage(error: unknown): AstraTextCertificationStage {
  if (error === null || error === undefined || (typeof error !== 'object' && typeof error !== 'function')) {
    return 'candidate_runtime_non_error'
  }
  const name = typeof (error as { name?: unknown }).name === 'string'
    ? (error as { name: string }).name
    : ''
  if (name === 'RangeError') return 'candidate_runtime_range_error'
  if (name === 'AggregateError') return 'candidate_runtime_aggregate_error'
  if (name === 'Error') return 'candidate_runtime_error_object'
  return 'candidate_runtime_unknown_object'
}

export function candidateFailureStage(error: unknown): AstraTextCertificationStage {
  let current: unknown = error
  const seen = new Set<object>()
  for (let depth = 0; depth < 4; depth += 1) {
    const classified = classifyCandidateError(current)
    if (classified) return classified
    if (!current || typeof current !== 'object' || seen.has(current as object)) break
    seen.add(current as object)
    current = (current as { cause?: unknown }).cause
  }
  return unknownCandidateFailureStage(error)
}

export function readAstraCertificationFailureStage(error: unknown): AstraTextCertificationStage | null {
  const message = error instanceof Error ? error.message : ''
  if (!message.startsWith(STAGE_PREFIX)) return null
  const stage = message.slice(STAGE_PREFIX.length) as AstraTextCertificationStage
  switch (stage) {
    case 'run_persistence':
    case 'candidate_execution':
    case 'candidate_timeout_or_unreachable':
    case 'candidate_connection_refused':
    case 'candidate_connection_reset':
    case 'candidate_network_unreachable':
    case 'candidate_aborted':
    case 'candidate_credentials_rejected':
    case 'candidate_rate_limited':
    case 'candidate_upstream_unavailable':
    case 'candidate_request_rejected':
    case 'candidate_model_or_chat_route_not_found':
    case 'candidate_response_invalid_json':
    case 'candidate_response_shape_invalid':
    case 'candidate_runtime_error_object':
    case 'candidate_route_reachable_runtime_failure':
    case 'candidate_runtime_range_error':
    case 'candidate_runtime_aggregate_error':
    case 'candidate_runtime_unknown_object':
    case 'candidate_runtime_non_error':
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
    case 'candidate_connection_refused':
      return { code: 'candidate_connection_refused', message: 'Blackstar reached the native Astra route, but the candidate connection was refused. The local Qwen bridge or Ollama listener is not accepting connections on the expected route.' } as const
    case 'candidate_connection_reset':
      return { code: 'candidate_connection_reset', message: 'The native Astra connection was closed before Blackstar received a complete candidate response.' } as const
    case 'candidate_network_unreachable':
      return { code: 'candidate_network_unreachable', message: 'The native Astra network route could not be reached from the production certification runtime.' } as const
    case 'candidate_aborted':
      return { code: 'candidate_aborted', message: 'The native Astra candidate request was aborted before a trusted response completed.' } as const
    case 'candidate_credentials_rejected':
      return { code: 'candidate_credentials_rejected', message: 'The native Astra endpoint rejected Blackstar runtime authentication. The configured native bridge credential must be rotated or corrected before certification can continue.' } as const
    case 'candidate_rate_limited':
      return { code: 'candidate_rate_limited', message: 'The native Astra endpoint rate limited this certification request.' } as const
    case 'candidate_upstream_unavailable':
      return { code: 'candidate_upstream_unavailable', message: 'The native Astra bridge responded, but its local model upstream was unavailable while executing this trusted case.' } as const
    case 'candidate_request_rejected':
      return { code: 'candidate_request_rejected', message: 'The native Astra chat-completions route is reachable, but rejected the bounded OpenAI-compatible candidate request. The configured request contract must be corrected before certification can continue.' } as const
    case 'candidate_model_or_chat_route_not_found':
      return { code: 'candidate_model_or_chat_route_not_found', message: 'The native Astra endpoint is reachable, but the pinned candidate model or configured chat-completions route was not found.' } as const
    case 'candidate_response_invalid_json':
      return { code: 'candidate_response_invalid_json', message: 'The native Astra endpoint returned a successful HTTP response that was not valid JSON. The local Qwen bridge or upstream response format must be corrected before certification can continue.' } as const
    case 'candidate_response_shape_invalid':
      return { code: 'candidate_response_shape_invalid', message: 'The native Astra endpoint returned JSON that did not match the OpenAI-compatible response shape required by Blackstar certification.' } as const
    case 'candidate_runtime_error_object':
      return { code: 'candidate_runtime_error_object', message: 'The native Astra execution path threw a generic runtime Error before a trusted candidate response completed.' } as const
    case 'candidate_route_reachable_runtime_failure':
      return { code: 'candidate_route_reachable_runtime_failure', message: 'The exact native Astra route is reachable and accepted the bounded health probe, but candidate execution still failed inside the runtime before a trusted response completed.' } as const
    case 'candidate_runtime_range_error':
      return { code: 'candidate_runtime_range_error', message: 'The native Astra execution path hit a bounded runtime range error before the candidate request completed.' } as const
    case 'candidate_runtime_aggregate_error':
      return { code: 'candidate_runtime_aggregate_error', message: 'The native Astra execution path returned multiple runtime failures without a single trusted candidate result.' } as const
    case 'candidate_runtime_unknown_object':
      return { code: 'candidate_runtime_unknown_object', message: 'The native Astra execution path threw an unrecognised runtime object before a trusted candidate response completed.' } as const
    case 'candidate_runtime_non_error':
      return { code: 'candidate_runtime_non_error', message: 'The native Astra execution path threw a non-Error runtime value before a trusted candidate response completed.' } as const
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
