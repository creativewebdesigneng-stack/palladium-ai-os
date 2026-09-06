import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveBlackstarAstraServingCacheControl } from '../blackstar-astra-serving-cache'
import { chatBody } from '../model-gateway.base'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Blackstar Astra serving cache', () => {
  it('fails closed when the Astra serving endpoint is not configured', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', '')
    vi.stubEnv('BLACKSTAR_ASTRA_PREFIX_CACHE_MODE', 'cache_prompt')

    expect(resolveBlackstarAstraServingCacheControl('compatible', 'blackstar-astra-v0.1')).toMatchObject({
      enabled: false,
      mode: 'none',
      request_fields: {},
    })
  })

  it('enables cache_prompt only for the exact configured Astra serving identity', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'http://astra.internal/v1')
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'astra-current')
    vi.stubEnv('BLACKSTAR_ASTRA_PREFIX_CACHE_MODE', 'cache_prompt')

    expect(resolveBlackstarAstraServingCacheControl('compatible', 'astra-current')).toMatchObject({
      enabled: true,
      mode: 'cache_prompt',
      request_fields: { cache_prompt: true },
    })
    expect(resolveBlackstarAstraServingCacheControl('compatible', 'other-local-model').enabled).toBe(false)
    expect(resolveBlackstarAstraServingCacheControl('deepseek', 'astra-current').enabled).toBe(false)
  })

  it('invalidates the cache contract after an Astra model rebind', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'http://astra.internal/v1')
    vi.stubEnv('BLACKSTAR_ASTRA_PREFIX_CACHE_MODE', 'cache_prompt')
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'astra-new')

    expect(resolveBlackstarAstraServingCacheControl('compatible', 'astra-old').enabled).toBe(false)
    expect(resolveBlackstarAstraServingCacheControl('compatible', 'astra-new').enabled).toBe(true)
  })

  it('adds the backend cache directive to Astra chat requests and nowhere else', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'http://astra.internal/v1')
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'astra-current')
    vi.stubEnv('BLACKSTAR_ASTRA_PREFIX_CACHE_MODE', 'cache_prompt')

    const astraBody = chatBody({
      provider: 'compatible',
      model: 'astra-current',
      messages: [{ role: 'user', content: 'Continue the bounded task' }],
    }, false)
    expect(astraBody).toMatchObject({ cache_prompt: true })

    const ordinaryCompatibleBody = chatBody({
      provider: 'compatible',
      model: 'another-model',
      messages: [{ role: 'user', content: 'Hello' }],
    }, false)
    expect(ordinaryCompatibleBody).not.toHaveProperty('cache_prompt')

    const ordinaryProviderBody = chatBody({
      provider: 'deepseek',
      model: 'astra-current',
      messages: [{ role: 'user', content: 'Hello' }],
    }, false)
    expect(ordinaryProviderBody).not.toHaveProperty('cache_prompt')
  })
})
