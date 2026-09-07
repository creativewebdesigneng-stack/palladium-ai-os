import { afterEach, describe, expect, it } from 'vitest'
import {
  isServerApprovedAstraCertificationJudge,
  listServerApprovedAstraCertificationJudges,
} from '../astra-certification-judge-policy.server'

const previousBase = process.env['FREELLMAPI_BASE_URL']
const previousKey = process.env['FREELLMAPI_API_KEY']
const previousModel = process.env['FREELLMAPI_MODEL']

afterEach(() => {
  if (previousBase == null) delete process.env['FREELLMAPI_BASE_URL']
  else process.env['FREELLMAPI_BASE_URL'] = previousBase
  if (previousKey == null) delete process.env['FREELLMAPI_API_KEY']
  else process.env['FREELLMAPI_API_KEY'] = previousKey
  if (previousModel == null) delete process.env['FREELLMAPI_MODEL']
  else process.env['FREELLMAPI_MODEL'] = previousModel
})

describe('Astra FreeLLM trusted certification judge', () => {
  it('does not surface FreeLLM without a configured endpoint and model', () => {
    delete process.env['FREELLMAPI_BASE_URL']
    delete process.env['FREELLMAPI_MODEL']
    expect(listServerApprovedAstraCertificationJudges().some((judge) => judge.provider === 'freellm')).toBe(false)
  })

  it('surfaces and approves only the exact configured FreeLLM model', () => {
    process.env['FREELLMAPI_BASE_URL'] = 'https://judge.example/v1'
    process.env['FREELLMAPI_API_KEY'] = 'server-only-secret'
    process.env['FREELLMAPI_MODEL'] = 'judge-model'

    const judges = listServerApprovedAstraCertificationJudges()
    expect(judges).toContainEqual({ provider: 'freellm', model: 'judge-model', label: 'FreeLLMAPI · judge-model' })
    expect(isServerApprovedAstraCertificationJudge('freellm', 'judge-model')).toBe(true)
    expect(isServerApprovedAstraCertificationJudge('freellm', 'wrong-model')).toBe(false)
  })
})
