import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/runtime/blackstar-astra-engine-profile', () => ({
  blackstarAstraModelDescriptor: () => ({ model: 'pinned-candidate' }),
}))

import { probeAstraCandidateRouteAfterGenericError } from './astra-candidate-route-probe.server'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function configureCandidate() {
  vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'https://candidate.example/v1')
  vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', 'test-private-key')
}

describe('Astra authenticated candidate diagnostic redirect boundary', () => {
  it('refuses redirects while checking models and never makes a chat request', async () => {
    configureCandidate()
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.redirect).toBe('error')
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-private-key')
      return Response.redirect('https://other.example/v1/models', 302)
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await probeAstraCandidateRouteAfterGenericError()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).not.toHaveProperty('credentialFingerprint')
    expect(JSON.stringify(result)).not.toContain('test-private-key')
  })

  it('does not read declared-oversized /models bodies and never exposes their contents', async () => {
    configureCandidate()
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/models')) {
        return new Response('do-not-expose-private-provider-content', {
          headers: { 'content-length': '500000', 'content-type': 'application/json' },
        })
      }
      return new Response('', { status: 404 })
    })
    vi.stubGlobal('fetch', fetcher)
    const result = await probeAstraCandidateRouteAfterGenericError()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(result)).not.toContain('do-not-expose-private-provider-content')
    expect(result.stage).toBe('candidate_model_or_chat_route_not_found')
  })

  it('rejects chunked-oversized /models bodies without leaking provider content', async () => {
    configureCandidate()
    const fetcher = vi.fn(async (url: string) => url.endsWith('/models')
      ? new Response('x'.repeat(130 * 1024))
      : new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetcher)
    const result = await probeAstraCandidateRouteAfterGenericError()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.stage).toBe('candidate_model_or_chat_route_not_found')
    expect(JSON.stringify(result)).not.toContain('xxxxx')
  })

  it('refuses redirects while checking chat after a valid model listing', async () => {
    configureCandidate()
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(init.redirect).toBe('error')
      if (url.endsWith('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'pinned-candidate' }] }), { status: 200 })
      }
      return Response.redirect('https://other.example/v1/chat/completions', 302)
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await probeAstraCandidateRouteAfterGenericError()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).not.toHaveProperty('credentialFingerprint')
    expect(JSON.stringify(result)).not.toContain('test-private-key')
  })
})
