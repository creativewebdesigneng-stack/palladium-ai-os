import { describe, expect, it } from 'vitest'
import {
  FREELLM_VERIFICATION_MARKER,
  FREELLM_VERIFICATION_MAX_TOKENS,
  FREELLM_VERIFICATION_TIMEOUT_MS,
  freeLlmVerificationPrompt,
  isFreeLlmVerificationMarker,
} from '../freellm-runtime-verification'

describe('FreeLLM evaluator verification contract', () => {
  it('uses a small bounded transport-only verification request', () => {
    expect(FREELLM_VERIFICATION_TIMEOUT_MS).toBe(30_000)
    expect(FREELLM_VERIFICATION_MAX_TOKENS).toBe(96)
    expect(freeLlmVerificationPrompt()).toBe(`Reply with exactly ${FREELLM_VERIFICATION_MARKER}`)
  })

  it('accepts the exact marker and harmless formatting', () => {
    expect(isFreeLlmVerificationMarker('BLACKSTAR_FREELLM_OK')).toBe(true)
    expect(isFreeLlmVerificationMarker('"BLACKSTAR_FREELLM_OK"')).toBe(true)
    expect(isFreeLlmVerificationMarker('```text\nBLACKSTAR_FREELLM_OK\n```')).toBe(true)
    expect(isFreeLlmVerificationMarker('<think>internal</think> BLACKSTAR_FREELLM_OK')).toBe(true)
  })

  it('rejects missing, altered, or embedded markers', () => {
    expect(isFreeLlmVerificationMarker('')).toBe(false)
    expect(isFreeLlmVerificationMarker('BLACKSTAR_FREELLM')).toBe(false)
    expect(isFreeLlmVerificationMarker('blackstar_freellm_ok')).toBe(false)
    expect(isFreeLlmVerificationMarker('XBLACKSTAR_FREELLM_OKY')).toBe(false)
  })
})
