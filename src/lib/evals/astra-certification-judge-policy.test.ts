import { afterEach, describe, expect, it } from 'vitest'
import {
  isIndependentFreeLlmRouteProvider,
  isPinnedFreeLlmCertificationModel,
  isTrustedAstraCertificationJudge,
} from './astra-certification-judge-policy'
import { matchesPinnedFreeLlmRoute, resolveFreeLlmEvaluatorConfig } from './freellm-evaluator.server'

const originalBaseUrl = process.env['FREELLMAPI_BASE_URL']
const originalApiKey = process.env['FREELLMAPI_API_KEY']
const originalModel = process.env['FREELLMAPI_MODEL']
const originalRoutedProvider = process.env['FREELLMAPI_ROUTED_PROVIDER']
const originalRoutedModel = process.env['FREELLMAPI_ROUTED_MODEL']

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

afterEach(() => {
  restore('FREELLMAPI_BASE_URL', originalBaseUrl)
  restore('FREELLMAPI_API_KEY', originalApiKey)
  restore('FREELLMAPI_MODEL', originalModel)
  restore('FREELLMAPI_ROUTED_PROVIDER', originalRoutedProvider)
  restore('FREELLMAPI_ROUTED_MODEL', originalRoutedModel)
})

describe('Astra certification FreeLLM policy', () => {
  it('rejects automatic, fusion, local and proxy route providers', () => {
    for (const provider of ['auto', 'fusion', 'ollama', 'custom', 'local', 'compatible', 'freellm']) {
      expect(isIndependentFreeLlmRouteProvider(provider)).toBe(false)
    }
    expect(isIndependentFreeLlmRouteProvider('nvidia')).toBe(true)
  })

  it('rejects unpinned FreeLLM certification model selectors', () => {
    expect(isPinnedFreeLlmCertificationModel('auto')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('auto:best')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('fusion')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('nemotron-3-super-120b')).toBe(true)
    expect(isPinnedFreeLlmCertificationModel('nemotron-3-super-120b-a12b:free')).toBe(true)
  })

  it('requires authenticated gateway and exact routed provider/model pins before trusting FreeLLM', () => {
    process.env['FREELLMAPI_BASE_URL'] = 'https://evaluator.example/v1'
    process.env['FREELLMAPI_MODEL'] = 'nemotron-3-super-120b'
    process.env['FREELLMAPI_API_KEY'] = 'test-bridge-token'
    delete process.env['FREELLMAPI_ROUTED_PROVIDER']
    delete process.env['FREELLMAPI_ROUTED_MODEL']
    expect(isTrustedAstraCertificationJudge('freellm', 'nemotron-3-super-120b')).toBe(false)

    process.env['FREELLMAPI_ROUTED_PROVIDER'] = 'nvidia'
    process.env['FREELLMAPI_ROUTED_MODEL'] = 'nemotron-3-super-120b-a12b:free'
    expect(isTrustedAstraCertificationJudge('freellm', 'nemotron-3-super-120b')).toBe(true)

    const config = resolveFreeLlmEvaluatorConfig()
    expect(config.certificationConfigured).toBe(true)
    expect(matchesPinnedFreeLlmRoute({ routedProvider: 'nvidia', routedModel: 'nemotron-3-super-120b-a12b:free' })).toBe(true)
    expect(matchesPinnedFreeLlmRoute({ routedProvider: 'nvidia', routedModel: 'another-model' })).toBe(false)
    expect(matchesPinnedFreeLlmRoute({ routedProvider: 'other-provider', routedModel: 'nemotron-3-super-120b-a12b:free' })).toBe(false)
  })
})
