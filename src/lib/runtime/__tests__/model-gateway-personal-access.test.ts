import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProviderError, runChat } from '../model-gateway.base'

const originalOpenAI = process.env['OPENAI_API_KEY']
const originalAnthropic = process.env['ANTHROPIC_API_KEY']

afterEach(() => {
  if (originalOpenAI === undefined) delete process.env['OPENAI_API_KEY']
  else process.env['OPENAI_API_KEY'] = originalOpenAI
  if (originalAnthropic === undefined) delete process.env['ANTHROPIC_API_KEY']
  else process.env['ANTHROPIC_API_KEY'] = originalAnthropic
  vi.restoreAllMocks()
})

describe('personal model provider access', () => {
  it('uses a request-scoped OpenAI credential without setting a process environment key', async () => {
    delete process.env['OPENAI_API_KEY']
    let headers = new Headers()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      headers = new Headers(init?.headers)
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'connected' } }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    const result = await runChat({
      provider: 'openai',
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hello' }],
      providerAccess: { provider: 'openai', apiKey: 'personal-openai-secret' },
    })

    expect(result.text).toBe('connected')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(headers.get('authorization')).toBe('Bearer personal-openai-secret')
    expect(process.env['OPENAI_API_KEY']).toBeUndefined()
  })

  it('never applies a credential to a different provider', async () => {
    delete process.env['OPENAI_API_KEY']
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(runChat({
      provider: 'openai',
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hello' }],
      providerAccess: { provider: 'anthropic', apiKey: 'anthropic-secret-must-not-leak' },
    })).rejects.toMatchObject<Partial<ProviderError>>({ status: 503 })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
