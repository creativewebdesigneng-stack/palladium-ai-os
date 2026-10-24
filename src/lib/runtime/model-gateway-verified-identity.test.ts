import { afterEach, describe, expect, it, vi } from 'vitest'
import { runChat, ProviderError } from './model-gateway.base'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const candidate = {
  provider: 'compatible' as const,
  model: 'pinned-candidate',
  messages: [{ role: 'user' as const, content: 'Reply with OK.' }],
  maxAttempts: 1,
  requireResponseModelIdentity: true,
}

function setCandidateEnv() {
  vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'https://candidate.example/v1')
  vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', 'private-candidate-token')
}

function chatResponse(model?: string) {
  return new Response(JSON.stringify({
    ...(model === undefined ? {} : { model }),
    choices: [{ message: { content: 'OK' } }],
    usage: { prompt_tokens: 4, completion_tokens: 1 },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('exact upstream model identity for trusted Astra candidate inference', () => {
  it('accepts the exact upstream model and refuses redirects', async () => {
    setCandidateEnv()
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(options.redirect).toBe('error')
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer private-candidate-token')
      return chatResponse('pinned-candidate')
    })
    vi.stubGlobal('fetch', request)
    const result = await runChat(candidate)
    expect(result).toMatchObject({ provider: 'compatible', model: 'pinned-candidate', text: 'OK' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it.each(['different-model', ''] as const)('rejects upstream model identity %j', async (upstream) => {
    setCandidateEnv()
    const request = vi.fn(async () => chatResponse(upstream))
    vi.stubGlobal('fetch', request)
    await expect(runChat(candidate)).rejects.toMatchObject({
      status: 502, retryable: false,
    })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rejects an absent upstream model identity rather than echoing the requested model', async () => {
    setCandidateEnv()
    const request = vi.fn(async () => chatResponse())
    vi.stubGlobal('fetch', request)
    await expect(runChat(candidate)).rejects.toThrow(/exact requested model/)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rejects redirected candidate requests without following a second host', async () => {
    setCandidateEnv()
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(options.redirect).toBe('error')
      return Response.redirect('https://redirect.example/v1/chat/completions', 302)
    })
    vi.stubGlobal('fetch', request)
    await expect(runChat(candidate)).rejects.toBeInstanceOf(ProviderError)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not break ordinary compatible-model chat providers that omit model identity', async () => {
    setCandidateEnv()
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(options.redirect).toBeUndefined()
      return chatResponse()
    })
    vi.stubGlobal('fetch', request)
    const result = await runChat({ ...candidate, requireResponseModelIdentity: false })
    expect(result).toMatchObject({ model: 'pinned-candidate', text: 'OK' })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
