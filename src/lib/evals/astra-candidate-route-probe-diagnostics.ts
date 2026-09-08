import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

export function classifyAstraCandidateRouteProbeStatus(status: number): AstraTextCertificationStage {
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 408 || status === 504) return 'candidate_timeout_or_unreachable'
  if (status === 502 || status === 503 || status >= 500) return 'candidate_upstream_unavailable'
  return 'candidate_route_reachable_runtime_failure'
}

/**
 * Classify only the HTTP status of a bounded chat-completions probe. The probe
 * body and provider response body are intentionally never exposed or persisted.
 * 400/422 prove the route is alive but reject the OpenAI-compatible request
 * contract; 404 means the configured chat path/model is unavailable.
 */
export function classifyAstraCandidateChatProbeStatus(status: number): AstraTextCertificationStage {
  if (status === 400 || status === 422) return 'candidate_response_shape_invalid'
  if (status === 404) return 'candidate_upstream_unavailable'
  return classifyAstraCandidateRouteProbeStatus(status)
}
