import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

const MAX_ADVERTISED_MODEL_IDS = 5
const MAX_MODEL_ID_LENGTH = 128
const SAFE_MODEL_ID = /^[A-Za-z0-9._:+\/-]+$/

function safeModelId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (!id || id.length > MAX_MODEL_ID_LENGTH || !SAFE_MODEL_ID.test(id)) return null
  return id
}

/**
 * Extract only bounded, identifier-shaped model names from the two supported
 * /models response formats. Arbitrary response fields, URLs, errors, prompts,
 * credentials and provider metadata are intentionally ignored.
 */
export function safeAstraAdvertisedModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const value = payload as { data?: unknown; models?: unknown }
  const identifiers: string[] = []
  const add = (candidate: unknown) => {
    const id = safeModelId(candidate)
    if (id && !identifiers.includes(id) && identifiers.length < MAX_ADVERTISED_MODEL_IDS) identifiers.push(id)
  }

  if (Array.isArray(value.data)) {
    for (const entry of value.data) {
      if (!entry || typeof entry !== 'object') continue
      add((entry as { id?: unknown }).id)
    }
  }
  if (Array.isArray(value.models)) {
    for (const entry of value.models) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as { name?: unknown; model?: unknown }
      add(item.name)
      add(item.model)
    }
  }

  return identifiers
}

export function safeAstraCandidateModelId(model: string): string | null {
  return safeModelId(model)
}

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
  const target = safeAstraCandidateModelId(model)
  if (!target) return null
  const identifiers = safeAstraAdvertisedModelIds(payload)
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
