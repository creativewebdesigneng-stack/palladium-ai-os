import { candidateFailureStage, type AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

const PROBE_TIMEOUT_MS = 10_000

function genericProbeFailure(stage: AstraTextCertificationStage): boolean {
  return stage === 'candidate_runtime_error_object'
    || stage === 'candidate_runtime_unknown_object'
    || stage === 'candidate_runtime_non_error'
}

export function classifyAstraCandidateRouteProbeStatus(status: number): AstraTextCertificationStage {
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 408 || status === 504) return 'candidate_timeout_or_unreachable'
  if (status === 502 || status === 503 || status >= 500) return 'candidate_upstream_unavailable'
  return 'candidate_route_reachable_runtime_failure'
}

export async function probeAstraCandidateRouteAfterGenericError(): Promise<AstraTextCertificationStage> {
  const rawBase = process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim()
  if (!rawBase) return 'candidate_runtime_error_object'
  const base = rawBase.replace(/\/+$/, '')
  const apiKey = process.env['OPENAI_COMPATIBLE_API_KEY']?.trim()

  try {
    const response = await fetch(`${base}/models`, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return classifyAstraCandidateRouteProbeStatus(response.status)
  } catch (error) {
    const stage = candidateFailureStage(error)
    return genericProbeFailure(stage) ? 'candidate_network_unreachable' : stage
  }
}
