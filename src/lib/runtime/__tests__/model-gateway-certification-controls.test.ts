import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatBody, runChat } from '../model-gateway.base'

const originalCompatibleBaseUrl = process.env['OPENAI_COMPATIBLE_BASE_URL']
const originalCompatibleApiKey = process.env['OPENAI_COMPATIBLE_API_KEY']

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalCompatibleBaseUrl == null) delete process.env['OPENAI_COMPATIBLE_BASE_URL']
  else process.env['OPENAI_COMPATIBLE_BASE_URL'] = originalCompatibleBaseUrl
  if (originalCompatibleApiKey == null) delete process.env['OPENAI_COMPATIBLE_API_KEY']
  else process.env['OPENAI_COMPATIBLE_API_KEY'] = originalCompatibleApiKey
})

describe('model gateway certification controls', () => {
  it('sends explicit reasoning effort only when requested', () => {
    const base = {
      provider: 'compatible' as const,
      model: 'ggml-org/gpt-oss-20b-GGUF',
      messages: [{ role: 'user' as const, content: 'test' }],
      maxTokens: 512,
    }

    expect(chatBody({ ...base, reasoningEffort: 'low' }, false)).toMatchObject({
      model: base.model,
      max_tokens: 512,
      reasoning_effort: 'low',
    })
    expect(chatBody(base, false)).not.toHaveProperty('reasoning_effort')
  })

  it('honours a one-attempt certification transport budget', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://astra-candidate.invalid/v1'
    delete process.env['OPENAI_COMPATIBLE_API_KEY']

    const fetchMock = vi.fn().mockResolvedValue(new Response('temporary failure', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(runChat({
      provider: 'compatible',
      model: 'ggml-org/gpt-oss-20b-GGUF',
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 512,
      timeoutMs: 60_000,
      reasoningEffort: 'low',
      maxAttempts: 1,
    })).rejects.toMatchObject({ status: 503 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(request.body)) as Record<string, unknown>
    expect(body['reasoning_effort']).toBe('low')
    expect(body['max_tokens']).toBe(512)
  })
})
