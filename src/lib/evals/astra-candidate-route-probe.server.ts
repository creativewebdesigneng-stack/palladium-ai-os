'use server'

import { createHash } from 'node:crypto'
import { blackstarAstraModelDescriptor } from '@/lib/runtime/blackstar-astra-engine-profile'
import {
  classifyAstraCandidateChatProbeStatus,
  classifyAstraCandidateRouteProbeStatus,
  isAstraCandidateModelListed,
  safeAstraAdvertisedModelIds,
  safeAstraCandidateModelId,
} from './astra-candidate-route-probe-diagnostics'
import { classifyAstraCandidateProbeFailure } from './astra-candidate-route-probe-failure'
import type { AstraTextCertificationStage } from './astra-certification-stage-diagnostics'

const PROBE_TIMEOUT_MS = 20_000
const MAX_MODELS_RESPONSE_BYTES = 128 * 1024
const CREDENTIAL_FINGERPRINT_LENGTH = 12

/** Bounded read shares the fetch timeout so slow/chunked model lists cannot
 * keep a diagnostic worker alive after the HTTP headers have arrived. */
async function readBoundedAstraModelsResponse(response: Response): Promise<unknown> {
  const rawLength = response.headers.get('content-length')
  if (rawLength && Number.isFinite(Number(rawLength)) && Number(rawLength) > MAX_MODELS_RESPONSE_BYTES) {
    throw new Error('candidate_models_response_oversized')
  }
  const reader = response.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_MODELS_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {})
        throw new Error('candidate_models_response_oversized')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(result))
}

type AstraCandidateRouteProbeResult = {
  stage: AstraTextCertificationStage
  expectedModel?: string
  advertisedModelIds?: string[]
  credentialFingerprint?: string
}

function normalizeCompatibleBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function normalizedApiKey(): string | undefined {
  return process.env['OPENAI_COMPATIBLE_API_KEY']?.trim() || undefined
}

function authHeaders(): HeadersInit {
  const apiKey = normalizedApiKey()
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

function credentialFingerprint(): string | undefined {
  const apiKey = normalizedApiKey()
  if (!apiKey) return undefined
  return createHash('sha256').update(apiKey, 'utf8').digest('hex').slice(0, CREDENTIAL_FINGERPRINT_LENGTH)
}

function credentialRejectedResult(stage: AstraTextCertificationStage): AstraCandidateRouteProbeResult {
  const fingerprint = stage === 'candidate_credentials_rejected' ? credentialFingerprint() : undefined
  return { stage, ...(fingerprint ? { credentialFingerprint: fingerprint } : {}) }
}

function withTimeout(signal: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  signal.addEventListener('abort', () => controller.abort(), { once: true })
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) }
}

export async function probeAstraCandidateRouteAfterGenericError(): Promise<AstraCandidateRouteProbeResult> {
  const raw = process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim()
  if (!raw) return { stage: 'candidate_route_not_configured' as AstraTextCertificationStage }
  const base = normalizeCompatibleBaseUrl(raw)
  try {
    const routeTimeout = withTimeout(new AbortController().signal)
    let routeStage: AstraTextCertificationStage
    let modelListed: boolean | null = null
    let advertisedModelIds: string[] = []
    const model = blackstarAstraModelDescriptor().model
    const expectedModel = safeAstraCandidateModelId(model) ?? undefined
    try {
      const routeResponse = await fetch(`${base}/models`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...authHeaders() },
        redirect: 'error',
        signal: routeTimeout.signal,
      })
      routeStage = classifyAstraCandidateRouteProbeStatus(routeResponse.status)
      if (routeStage !== 'candidate_route_reachable_runtime_failure') return credentialRejectedResult(routeStage)
      try {
        const routePayload = await readBoundedAstraModelsResponse(routeResponse)
        modelListed = isAstraCandidateModelListed(routePayload, model)
        advertisedModelIds = safeAstraAdvertisedModelIds(routePayload)
      } catch {
        // Untrusted, invalid or oversized body cannot establish model
        // absence. Keep conservative status without exposing provider data.
        modelListed = null
      }
    } finally {
      routeTimeout.cleanup()
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
        redirect: 'error',
        signal: chatTimeout.signal,
      })
      const stage = classifyAstraCandidateChatProbeStatus(chatResponse.status, modelListed)
      if (stage === 'candidate_credentials_rejected') return credentialRejectedResult(stage)
      return stage === 'candidate_model_not_found'
        ? { stage, ...(expectedModel ? { expectedModel } : {}), ...(advertisedModelIds.length ? { advertisedModelIds } : {}) }
        : { stage }
    } finally {
      chatTimeout.cleanup()
    }
  } catch (error) {
    return { stage: classifyAstraCandidateProbeFailure(error) }
  }
}
