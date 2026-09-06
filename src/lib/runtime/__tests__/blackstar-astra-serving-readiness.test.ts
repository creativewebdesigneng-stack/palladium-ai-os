import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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
    })

    expect(result).toMatchObject({
      ready: true,
      model: 'blackstar-astra-v0.1',
      reason: 'ready',
      source: 'models_endpoint',
    })
    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/models`, expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer server-secret' }),
    }))
  })

  it('fails closed when the endpoint is reachable but the exact model is absent', async () => {
    const fetchImpl = vi.fn(async () => response({ data: [{ id: 'blackstar-astra-v0.2' }] }))
    const result = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(result.ready).toBe(false)
    expect(result.reason).toBe('model_missing')
  })

  it('fails closed on invalid response shape, HTTP failure, or missing endpoint configuration', async () => {
    const malformed = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn(async () => response({ models: ['blackstar-astra-v0.1'] })) as typeof fetch,
      force: true,
    })
    expect(malformed).toMatchObject({ ready: false, reason: 'invalid_response' })

    const failed = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn(async () => response({ error: 'unavailable' }, 503)) as typeof fetch,
      force: true,
    })
    expect(failed).toMatchObject({ ready: false, reason: 'request_failed' })

    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    const missing = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: vi.fn() as typeof fetch,
      force: true,
    })
    expect(missing).toMatchObject({ ready: false, reason: 'not_configured' })
  })

  it('uses a bounded cache keyed by endpoint and exact model identity', async () => {
    const fetchImpl = vi.fn(async () => response({ data: [{ id: 'blackstar-astra-v0.1' }] }))
    const first = await probeBlackstarAstraServingReadiness({
      model: 'blackstar-astra-v0.1',
      fetchImpl: fetchImpl as typeof fetch,
      now: 1_000,
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
    })

    expect(first.ready).toBe(true)
    expect(cached.ready).toBe(true)
    expect(expired.ready).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
