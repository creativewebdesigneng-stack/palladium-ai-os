import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

export function classifyAstraCandidateRouteProbeStatus(status: number): AstraTextCertificationStage {
  if (status === 401 || status === 403) return 'candidate_credentials_rejected'
  if (status === 429) return 'candidate_rate_limited'
  if (status === 408 || status === 504) return 'candidate_timeout_or_unreachable'
  if (status === 502 || status === 503 || status >= 500) return 'candidate_upstream_unavailable'
  return 'candidate_route_reachable_runtime_failure'
}

/**
 * Read only model identifiers from a bounded /models response and reduce the
 * result to a boolean. The response payload itself is never surfaced or stored.
 */
export function isAstraCandidateModelListed(payload: unknown, model: string): boolean | null {
  if (!payload || typeof payload !== 'object') return null
  const target = model.trim()
  if (!target) return null
  const value = payload as {
    data?: unknown
    models?: unknown
  }

  const identifiers: string[] = []
  if (Array.isArray(value.data)) {
    for (const entry of value.data) {
      if (!entry || typeof entry !== 'object') continue
      const id = (entry as { id?: unknown }).id
      if (typeof id === 'string' && id.trim()) identifiers.push(id.trim())
    }
  }
  if (Array.isArray(value.models)) {
    for (const entry of value.models) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as { name?: unknown; model?: unknown }
      if (typeof item.name === 'string' && item.name.trim()) identifiers.push(item.name.trim())
      if (typeof item.model === 'string' && item.model.trim()) identifiers.push(item.model.trim())
    }
  }

  if (!identifiers.length) return null
  return identifiers.includes(target)
}

/**
 * Classify only the HTTP status of a bounded chat-completions probe. The probe
 * body and provider response body are intentionally never exposed or persisted.
 * A 404 is refined when /models already proved whether the exact pinned model
 * exists; otherwise the combined conservative diagnostic is retained.
 */
export function classifyAstraCandidateChatProbeStatus(
  status: number,
  modelListed: boolean | null = null,
): AstraTextCertificationStage {
  if (status === 400 || status === 422) return 'candidate_request_rejected'
  if (status === 404) {
    if (modelListed === false) return 'candidate_model_not_found'
    if (modelListed === true) return 'candidate_chat_route_not_found'
    return 'candidate_model_or_chat_route_not_found'
  }
  return classifyAstraCandidateRouteProbeStatus(status)
}
