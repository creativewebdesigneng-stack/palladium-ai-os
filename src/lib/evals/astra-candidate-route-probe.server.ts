'use server'

import { blackstarAstraModelDescriptor } from '@/lib/runtime/blackstar-astra-engine-profile'
import {
  classifyAstraCandidateChatProbeStatus,
  classifyAstraCandidateRouteProbeStatus,
  isAstraCandidateModelListed,
  safeAstraAdvertisedModelIds,
  safeAstraCandidateModelId,
} from './astra-candidate-route-probe-diagnostics'
import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

const PROBE_TIMEOUT_MS = 20_000

type AstraCandidateRouteProbeResult = {
  stage: AstraTextCertificationStage
  expectedModel?: string
  advertisedModelIds?: string[]
}

function normalizeCompatibleBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function authHeaders(): HeadersInit {
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim()
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

function withTimeout(signal: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  signal.addEventListener('abort', () => controller.abort(), { once: true })
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) }
}

export async function probeAstraCandidateRouteAfterGenericError(): Promise<AstraCandidateRouteProbeResult> {
  const raw = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim()
  if (!raw) return { stage: 'candidate_route_not_configured' as AstraTextCertificationStage }
  const base = normalizeCompatibleBaseUrl(raw)
  try {
    const routeTimeout = withTimeout(new AbortController().signal)
    let routeResponse: Response
    try {
      routeResponse = await fetch(`${base}/models`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...authHeaders() },
        signal: routeTimeout.signal,
      })
    } finally {
      routeTimeout.cleanup()
    }
    const routeStage = classifyAstraCandidateRouteProbeStatus(routeResponse.status)
    if (routeStage !== 'candidate_route_reachable_runtime_failure') return { stage: routeStage }

    const model = blackstarAstraModelDescriptor().model
    const expectedModel = safeAstraCandidateModelId(model) ?? undefined
    let modelListed: boolean | null = null
    let advertisedModelIds: string[] = []
    try {
      const routePayload = await routeResponse.json()
      modelListed = isAstraCandidateModelListed(routePayload, model)
      advertisedModelIds = safeAstraAdvertisedModelIds(routePayload)
    } catch {
      modelListed = null
    }

    const chatTimeout = withTimeout(new AbortController().signal)
    try {
      const chatResponse = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          stream: false,
          max_tokens: 1,
        }),
        signal: chatTimeout.signal,
      })
      const stage = classifyAstraCandidateChatProbeStatus(chatResponse.status, modelListed)
      return stage === 'candidate_model_not_found'
        ? { stage, ...(expectedModel ? { expectedModel } : {}), ...(advertisedModelIds.length ? { advertisedModelIds } : {}) }
        : { stage }
    } finally {
      chatTimeout.cleanup()
    }
  } catch {
    return { stage: 'candidate_network_unreachable' }
  }
}
