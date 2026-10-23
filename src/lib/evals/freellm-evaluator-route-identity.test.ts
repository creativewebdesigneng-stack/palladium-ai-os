import { describe, expect, it } from 'vitest'
import { matchesPinnedFreeLlmRoute, parseFreeLlmRouteIdentity } from './freellm-evaluator.server'

const env = {
  FREELLMAPI_BASE_URL: 'https://evaluator.invalid/v1',
  FREELLMAPI_API_KEY: 'test-only',
  FREELLMAPI_MODEL: 'independent-judge',
  FREELLMAPI_ROUTED_PROVIDER: 'openai',
  FREELLMAPI_ROUTED_MODEL: 'openai/gpt-oss-20b',
}

describe('Astra independent evaluator route identity', () => {
  it('preserves slash-qualified upstream model IDs with a router prefix', () => {
    const route = parseFreeLlmRouteIdentity(new Headers({
      'x-routed-via': 'freellm/openai/openai/gpt-oss-20b',
      'x-fallback-attempts': '0',
    }), env)
    expect(route).toMatchObject({
      routedProvider: 'openai',
      routedModel: 'openai/gpt-oss-20b',
      fallbackAttempts: 0,
    })
    expect(matchesPinnedFreeLlmRoute(route, env)).toBe(true)
  })

  it('accepts an exact provider/model route without a router prefix', () => {
    const route = parseFreeLlmRouteIdentity(new Headers({
      'x-routed-via': 'openai/openai/gpt-oss-20b',
    }), env)
    expect(matchesPinnedFreeLlmRoute(route, env)).toBe(true)
  })

  it('rejects a different upstream model even when its name has a shared suffix', () => {
    const route = parseFreeLlmRouteIdentity(new Headers({
      'x-routed-via': 'freellm/other/openai/gpt-oss-20b',
    }), env)
    expect(matchesPinnedFreeLlmRoute(route, env)).toBe(false)
  })

  it('continues to support flat upstream model IDs', () => {
    const flat = { ...env, FREELLMAPI_ROUTED_MODEL: 'judge-model' }
    const route = parseFreeLlmRouteIdentity(new Headers({
      'x-routed-via': 'freellm/openai/judge-model',
    }), flat)
    expect(route.routedModel).toBe('judge-model')
    expect(matchesPinnedFreeLlmRoute(route, flat)).toBe(true)
  })

  it('fails closed for missing route identity', () => {
    expect(() => parseFreeLlmRouteIdentity(new Headers(), env)).toThrow(/X-Routed-Via identity/)
  })
})
