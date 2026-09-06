import { BLACKSTAR_ASTRA_ENGINE_PROFILE } from './blackstar-astra-engine-profile'

export type BlackstarAstraServingReadiness = {
  ready: boolean
  model: string
  checked_at: string
  source: 'models_endpoint'
  reason: 'ready' | 'not_configured' | 'model_missing' | 'invalid_response' | 'request_failed'
}

type FetchLike = typeof fetch

type CacheEntry = {
  expiresAt: number
  result: BlackstarAstraServingReadiness
}

const SUCCESS_TTL_MS = 30_000
const FAILURE_TTL_MS = 5_000
const PROBE_TIMEOUT_MS = 2_500
const cache = new Map<string, CacheEntry>()

function configuredBaseUrl(): string {
  return process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.baseUrlEnv]?.trim().replace(/\/+$/, '') ?? ''
}

function modelsUrl(baseUrl: string): string {
  return `${baseUrl}/models`
}

function cacheKey(baseUrl: string, model: string): string {
  return `${baseUrl}\u0000${model}`
}

function result(
  model: string,
  reason: BlackstarAstraServingReadiness['reason'],
  now: number,
): BlackstarAstraServingReadiness {
  return {
    ready: reason === 'ready',
    model,
    checked_at: new Date(now).toISOString(),
    source: 'models_endpoint',
    reason,
  }
}

function parseModelIds(value: unknown): string[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = (value as Record<string, unknown>)['data']
  if (!Array.isArray(data)) return null
  const ids = data
    .map((item) => item && typeof item === 'object' && !Array.isArray(item)
      ? (item as Record<string, unknown>)['id']
      : null)
    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    .map((id) => id.trim())
  return ids
}

/**
 * Verifies that the exact configured Astra serving model is exposed by the
 * Blackstar-controlled OpenAI-compatible endpoint. This is availability only:
 * verified evaluation evidence remains the routing authority, and this probe
 * grants no tools, approvals, identity, delegation or execution permission.
 */
export async function probeBlackstarAstraServingReadiness(args: {
  model: string
  fetchImpl?: FetchLike
  now?: number
  force?: boolean
}): Promise<BlackstarAstraServingReadiness> {
  const model = String(args.model ?? '').trim()
  const now = args.now ?? Date.now()
  const baseUrl = configuredBaseUrl()
  if (!baseUrl || !model) return result(model, 'not_configured', now)

  const key = cacheKey(baseUrl, model)
  if (!args.force) {
    const cached = cache.get(key)
    if (cached && cached.expiresAt > now) return cached.result
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const apiKey = process.env[BLACKSTAR_ASTRA_ENGINE_PROFILE.apiKeyEnv]?.trim()
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await (args.fetchImpl ?? fetch)(modelsUrl(baseUrl), {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    if (!response.ok) {
      const unavailable = result(model, 'request_failed', now)
      cache.set(key, { result: unavailable, expiresAt: now + FAILURE_TTL_MS })
      return unavailable
    }

    const ids = parseModelIds(await response.json().catch(() => null))
    const readiness = ids === null
      ? result(model, 'invalid_response', now)
      : ids.includes(model)
        ? result(model, 'ready', now)
        : result(model, 'model_missing', now)
    cache.set(key, {
      result: readiness,
      expiresAt: now + (readiness.ready ? SUCCESS_TTL_MS : FAILURE_TTL_MS),
    })
    return readiness
  } catch {
    const unavailable = result(model, 'request_failed', now)
    cache.set(key, { result: unavailable, expiresAt: now + FAILURE_TTL_MS })
    return unavailable
  } finally {
    clearTimeout(timer)
  }
}

/** Test and controlled-reload helper. */
export function clearBlackstarAstraServingReadinessCache(): void {
  cache.clear()
}
