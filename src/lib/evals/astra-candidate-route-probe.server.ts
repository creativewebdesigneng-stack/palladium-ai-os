import { blackstarAstraModelDescriptor } from '@/lib/runtime/blackstar-astra-engine-profile'
import { candidateFailureStage, type AstraTextCertificationStage } from './astra-certification-stage-diagnostics'
import {
  classifyAstraCandidateChatProbeStatus,
  classifyAstraCandidateRouteProbeStatus,
} from './astra-candidate-route-probe-diagnostics'

const PROBE_TIMEOUT_MS = 20_000

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
  const authHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}

  try {
    const routeResponse = await fetch(`${base}/models`, {
      method: 'GET',
      headers: authHeaders,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    const routeStage = classifyAstraCandidateRouteProbeStatus(routeResponse.status)
    if (routeStage !== 'candidate_route_reachable_runtime_failure') return routeStage

    const model = blackstarAstraModelDescriptor().model
    const chatResponse = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        stream: false,
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return classifyAstraCandidateChatProbeStatus(chatResponse.status)
  } catch (error) {
    const stage = candidateFailureStage(error)
    return genericProbeFailure(stage) ? 'candidate_network_unreachable' : stage
  }
}
