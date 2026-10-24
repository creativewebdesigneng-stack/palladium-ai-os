import { afterEach, describe, expect, it, vi } from 'vitest'
import { runFreeLlmJudge } from './freellm-evaluator.server'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function setJudge() {
  vi.stubEnv('FREELLMAPI_BASE_URL', 'https://judge.example/v1')
  vi.stubEnv('FREELLMAPI_API_KEY', 'test-only-judge-secret')
  vi.stubEnv('FREELLMAPI_MODEL', 'pinned-judge')
  vi.stubEnv('FREELLMAPI_ROUTED_PROVIDER', 'openai')
  vi.stubEnv('FREELLMAPI_ROUTED_MODEL', 'independent-weights')
}

const args = { model: 'pinned-judge', messages: [{ role: 'user' as const, content: 'Judge the sample.' }] }

const goodBody = JSON.stringify({
  choices: [{ message: { content: '[{"index":0,"score":80}]' } }],
  usage: { prompt_tokens: 10, completion_tokens: 8 },
})
const route = { 'x-routed-via': 'freellm/openai/independent-weights' }

describe('FreeLLM independent evaluator HTTP boundaries', () => {
  it('runs with a pinned route without permitting HTTP redirects', async () => {
    setJudge()
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.redirect).toBe('error')
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-only-judge-secret')
      return new Response(goodBody, { headers: { ...route, 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetcher)
    const result = await runFreeLlmJudge(args)
    expect(result).toMatchObject({ provider: 'freellm', model: 'pinned-judge',
      routedProvider: 'openai', routedModel: 'independent-weights' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects oversized declared responses before reading their body', async () => {
    setJudge()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(goodBody, {
      headers: { ...route, 'content-length': '300000' },
    })))
    await expect(runFreeLlmJudge(args)).rejects.toThrow(/oversized evaluator response/)
  })

  it('rejects a streamed oversized response even when content length is absent', async () => {
    setJudge()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x'.repeat(270000), {
      headers: route,
    })))
    await expect(runFreeLlmJudge(args)).rejects.toThrow(/oversized evaluator response/)
  })

  it('does not echo evaluator error bodies that contain private prompts or tokens', async () => {
    setJudge()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('secret=do-not-expose', {
      status: 503, headers: route,
    })))
    let error: unknown
    try { await runFreeLlmJudge(args) } catch (caught) { error = caught }
    expect(error).toBeInstanceOf(Error)
    expect(String((error as Error).message)).toContain('503')
    expect(String((error as Error).message)).not.toContain('do-not-expose')
  })
})
