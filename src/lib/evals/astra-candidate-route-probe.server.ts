import { candidateFailureStage, type AstraTextCertificationStage } from './astra-certification-stage-diagnostics'
import { classifyAstraCandidateRouteProbeStatus } from './astra-candidate-route-probe-diagnostics'

const PROBE_TIMEOUT_MS = 10_000

function genericProbeFailure(stage: AstraTextCertificationStage): boolean {
  return stage === 'candidate_runtime_error_object'
    || stage === 'candidate_runtime_unknown_object'
    || stage === 'candidate_runtime_non_error'
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
