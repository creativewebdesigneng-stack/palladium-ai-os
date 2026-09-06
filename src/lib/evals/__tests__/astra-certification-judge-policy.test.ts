import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_JUDGES,
  isTrustedAstraCertificationJudge,
  judgeMatchesCandidate,
} from '../astra-certification-judge-policy'

describe('Astra certification judge policy', () => {
  it('accepts only server-owned judge identities', () => {
    expect(isTrustedAstraCertificationJudge('groq', 'openai/gpt-oss-20b')).toBe(true)
    expect(isTrustedAstraCertificationJudge('openai', 'gpt-5-mini')).toBe(true)
    expect(isTrustedAstraCertificationJudge('deepseek', 'deepseek-chat')).toBe(false)
    expect(isTrustedAstraCertificationJudge('compatible', 'blackstar-astra-v0.1')).toBe(false)
  })

  it('restricts approved judges to the independent provider set', () => {
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
