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
