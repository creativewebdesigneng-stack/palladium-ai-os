import { candidateFailureStage, type AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

export function classifyAstraCandidateProbeFailure(error: unknown): AstraTextCertificationStage {
  let current: unknown = error
  const seen = new Set<object>()

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object' || seen.has(current as object)) break
    seen.add(current as object)

    const value = current as { code?: unknown; name?: unknown; cause?: unknown }
    const code = typeof value.code === 'string' ? value.code.toUpperCase() : ''
    if (code === 'ECONNREFUSED') return 'candidate_connection_refused'
    if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'candidate_connection_reset'
    if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'ENOTFOUND') {
      return 'candidate_network_unreachable'
    }
    if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT') {
      return 'candidate_timeout_or_unreachable'
    }

    // The route probe owns its AbortController and only aborts it when the
    // bounded 20-second probe window expires, so AbortError here is a timeout.
    if (value.name === 'AbortError') return 'candidate_timeout_or_unreachable'

    current = value.cause
  }

  const stage = candidateFailureStage(error)
  return stage === 'candidate_aborted' ? 'candidate_timeout_or_unreachable' : stage
}
