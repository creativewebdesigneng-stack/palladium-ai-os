import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatBody } from '../model-gateway.base'

afterEach(() => vi.unstubAllEnvs())

describe('Astra compatible request cache contract', () => {
  it('remains absent unless the operator explicitly opts in', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'http://astra.internal/v1')
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'astra-current')
    vi.stubEnv('BLACKSTAR_ASTRA_PREFIX_CACHE_MODE', '')

    const body = chatBody({
      provider: 'compatible',
      model: 'astra-current',
      messages: [{ role: 'user', content: 'test' }],
    }, false)

    expect(body).not.toHaveProperty('cache_prompt')
  })
})
