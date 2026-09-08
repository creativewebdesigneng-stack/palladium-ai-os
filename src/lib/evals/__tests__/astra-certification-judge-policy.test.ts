import { afterEach, describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_JUDGES,
  isPinnedFreeLlmCertificationModel,
  isTrustedAstraCertificationJudge,
  judgeMatchesCandidate,
} from '../astra-certification-judge-policy'

const previousBase = process.env['FREELLMAPI_BASE_URL']
const previousApiKey = process.env['FREELLMAPI_API_KEY']
const previousModel = process.env['FREELLMAPI_MODEL']

afterEach(() => {
  if (previousBase == null) delete process.env['FREELLMAPI_BASE_URL']
  else process.env['FREELLMAPI_BASE_URL'] = previousBase
  if (previousApiKey == null) delete process.env['FREELLMAPI_API_KEY']
  else process.env['FREELLMAPI_API_KEY'] = previousApiKey
  if (previousModel == null) delete process.env['FREELLMAPI_MODEL']
  else process.env['FREELLMAPI_MODEL'] = previousModel
})

describe('Astra certification judge policy', () => {
  it('accepts only server-owned or exact authenticated configured pinned FreeLLM judge identities', () => {
    expect(isTrustedAstraCertificationJudge('groq', 'openai/gpt-oss-20b')).toBe(true)
    expect(isTrustedAstraCertificationJudge('openai', 'gpt-5-mini')).toBe(true)
    expect(isTrustedAstraCertificationJudge('deepseek', 'deepseek-chat')).toBe(false)
    expect(isTrustedAstraCertificationJudge('compatible', 'blackstar-astra-v0.1')).toBe(false)

    process.env['FREELLMAPI_BASE_URL'] = 'https://judge.example/v1'
    process.env['FREELLMAPI_MODEL'] = 'independent-judge'
    delete process.env['FREELLMAPI_API_KEY']
    expect(isTrustedAstraCertificationJudge('freellm', 'independent-judge')).toBe(false)

    process.env['FREELLMAPI_API_KEY'] = 'test-bridge-token'
    expect(isTrustedAstraCertificationJudge('freellm', 'independent-judge')).toBe(true)
    expect(isTrustedAstraCertificationJudge('freellm', 'other-model')).toBe(false)

    delete process.env['FREELLMAPI_BASE_URL']
    expect(isTrustedAstraCertificationJudge('freellm', 'independent-judge')).toBe(false)
  })

  it('rejects FreeLLM virtual routing identities for trusted certification', () => {
    expect(isPinnedFreeLlmCertificationModel('gemini-2.5-flash')).toBe(true)
    expect(isPinnedFreeLlmCertificationModel('openai/gpt-oss-20b')).toBe(true)
    expect(isPinnedFreeLlmCertificationModel('auto')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('auto:smart')).toBe(false)
    expect(isPinnedFreeLlmCertificationModel('fusion')).toBe(false)

    process.env['FREELLMAPI_BASE_URL'] = 'https://judge.example/v1'
    process.env['FREELLMAPI_API_KEY'] = 'test-bridge-token'
    process.env['FREELLMAPI_MODEL'] = 'auto'
    expect(isTrustedAstraCertificationJudge('freellm', 'auto')).toBe(false)
    process.env['FREELLMAPI_MODEL'] = 'fusion'
    expect(isTrustedAstraCertificationJudge('freellm', 'fusion')).toBe(false)
  })

  it('keeps static approved judges restricted to the established independent providers', () => {
    expect(new Set(ASTRA_CERTIFICATION_JUDGES.map((judge) => judge.provider))).toEqual(new Set(['groq', 'openai']))
  })

  it('detects when the judge is also one of the contestants', () => {
    const judge = { provider: 'groq', model: 'openai/gpt-oss-20b' }
    expect(judgeMatchesCandidate(judge, [
      { provider: 'compatible', model: 'qwen/qwen3.8-27b' },
      { provider: 'groq', model: 'openai/gpt-oss-20b' },
    ])).toBe(true)
    expect(judgeMatchesCandidate(judge, [
      { provider: 'compatible', model: 'qwen/qwen3.8-27b' },
      { provider: 'openai', model: 'gpt-5-mini' },
    ])).toBe(false)
  })
})
