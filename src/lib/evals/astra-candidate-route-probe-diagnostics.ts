import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

export function classifyAstraCandidateRouteProbeStatus(status: number): AstraTextCertificationStage {
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 408 || status === 504) return 'candidate_timeout_or_unreachable'
  if (status === 502 || status === 503 || status >= 500) return 'candidate_upstream_unavailable'
  return 'candidate_route_reachable_runtime_failure'
}
