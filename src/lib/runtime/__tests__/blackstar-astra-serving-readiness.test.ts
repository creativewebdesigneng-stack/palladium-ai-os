import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BLACKSTAR_ASTRA_DEGRADED_PROBE_LATENCY_MS,
  clearBlackstarAstraServingReadinessCache,
  probeBlackstarAstraServingReadiness,
} from '../blackstar-astra-serving-readiness.server'

const BASE = 'https://astra.example.test/v1'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function clock(...values: number[]) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)] ?? 0
}

describe('Blackstar Astra serving readiness', () => {
  beforeEach(() => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = BASE
    process.env['OPENAI_COMPATIBLE_API_KEY'] = 'server-secret'
    clearBlackstarAstraServingReadinessCache()
  })

  afterEach(() => {
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    delete process.env['OPENAI_COMPATIBLE_API_KEY']
    clearBlackstarAstraServingReadinessCache()
  })

  it('requires the exact configured model to appear in the compatible /models response', async () => {
    const fetchImpl = vi.fn(async () => response({
      data: [{ id: 'blackstar-astra-v0.1' }, { id: 'other-model' }],
    }))

    const result = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      now: Date.parse('2026-09-06T16:10:00.000Z'),
      clock: clock(1_000, 1_120),
    })

    expect(result).toMatchObject({
      ready: true,
      model: 'blackstar-astra-v0.1',
      reason: 'ready',
      source: 'models_endpoint',
      health: 'healthy',
      latency_ms: 120,
    })
    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/models`, expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer server-secret' }),
    }))
  })

  it('reports slow live serving as degraded diagnostics without inventing routing authority', async () => {
    const fetchImpl = vi.fn(async () => response({ data: [{ id: 'blackstar-astra-v0.1' }] }))
    const result = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      force: true,
      clock: clock(5_000, 5_000 + BLACKSTAR_ASTRA_DEGRADED_PROBE_LATENCY_MS + 1),
    })

    expect(result.ready).toBe(true)
    expect(result.reason).toBe('ready')
    expect(result.health).toBe('degraded')
    expect(result.latency_ms).toBe(BLACKSTAR_ASTRA_DEGRADED_PROBE_LATENCY_MS + 1)
  })

  it('fails closed when the endpoint is reachable but the exact model is absent', async () => {
    const fetchImpl = vi.fn(async () => response({ data: [{ id: 'blackstar-astra-v0.2' }] }))
    const result = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      clock: clock(2_000, 2_040),
    })

    expect(result.ready).toBe(false)
    expect(result.reason).toBe('model_missing')
    expect(result.health).toBe('unavailable')
    expect(result.latency_ms).toBe(40)
  })

  it('fails closed on invalid response shape, HTTP failure, or missing endpoint configuration', async () => {
    const malformed = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn(async () => response({ models: ['blackstar-astra-v0.1'] })) as typeof fetch,
      force: true,
      clock: clock(1, 2),
    })
    expect(malformed).toMatchObject({ ready: false, reason: 'invalid_response', health: 'unavailable' })

    const failed = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn(async () => response({ error: 'unavailable' }, 503)) as typeof fetch,
      force: true,
      clock: clock(10, 20),
    })
    expect(failed).toMatchObject({ ready: false, reason: 'request_failed', health: 'unavailable', latency_ms: 10 })

    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    const missing = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn() as typeof fetch,
      force: true,
    })
    expect(missing).toMatchObject({ ready: false, reason: 'not_configured', health: 'unavailable', latency_ms: null })
  })

  it('uses a bounded cache keyed by endpoint and exact model identity', async () => {
    const fetchImpl = vi.fn(async () => response({ data: [{ id: 'blackstar-astra-v0.1' }] }))
    const first = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      now: 1_000,
      clock: clock(1, 2),
    })
    const cached = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      now: 20_000,
    })
    const expired = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      now: 31_001,
      clock: clock(3, 4),
    })

    expect(first.ready).toBe(true)
    expect(cached.ready).toBe(true)
    expect(cached.latency_ms).toBe(first.latency_ms)
    expect(expired.ready).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
