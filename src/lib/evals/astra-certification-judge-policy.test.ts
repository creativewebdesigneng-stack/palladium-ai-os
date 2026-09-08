import { afterEach, describe, expect, it } from 'vitest'
import {
  isIndependentFreeLlmRouteProvider,
  isPinnedFreeLlmCertificationModel,
  isTrustedAstraCertificationJudge,
} from './astra-certification-judge-policy'

const originalBaseUrl = process.env['FREELLMAPI_BASE_URL']
const originalApiKey = process.env['FREELLMAPI_API_KEY']
const originalModel = process.env['FREELLMAPI_MODEL']

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

afterEach(() => {
  restore('FREELLMAPI_BASE_URL', originalBaseUrl)
  restore('FREELLMAPI_API_KEY', originalApiKey)
  restore('FREELLMAPI_MODEL', originalModel)
})

describe('Astra certification FreeLLM policy', () => {
  it('rejects automatic, fusion, local and proxy route providers', () => {
    for (const provider of ['auto', 'fusion', 'ollama', 'custom', 'local', 'compatible', 'freellm']) {
      expect(isIndependentFreeLlmRouteProvider(provider)).toBe(false)
    }
    expect(isIndependentFreeLlmRouteProvider('independent-upstream')).toBe(true)
  })

  it('rejects unpinned FreeLLM certification model selectors', () => {
    expect(isPinnedFreeLlmCertificationModel('auto')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('auto:best')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('fusion')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('nemotron-3-super-120b')).toBe(true)
  })

  it('requires the authenticated server configuration before trusting the FreeLLM judge identity', () => {
    process.env['FREELLMAPI_BASE_URL'] = 'https://evaluator.example/v1'
    process.env['FREELLMAPI_MODEL'] = 'nemotron-3-super-120b'
    delete process.env['FREELLMAPI_API_KEY']
    expect(isTrustedAstraCertificationJudge('freellm', 'nemotron-3-super-120b')).toBe(false)

    process.env['FREELLMAPI_API_KEY'] = 'test-bridge-token'
    expect(isTrustedAstraCertificationJudge('freellm', 'nemotron-3-super-120b')).toBe(true)
  })
})
