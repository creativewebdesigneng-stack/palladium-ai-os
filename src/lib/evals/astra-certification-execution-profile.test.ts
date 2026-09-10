import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_PROVENANCE_VERSION,
  buildAstraCertificationExecutionPrompt,
  hashAstraCertificationExecutionPrompt,
  resolveAstraCertificationExecutionProfile,
  sameAstraCertificationExecutionProfile,
} from './astra-certification-execution-profile'

describe('Astra certification execution profile', () => {
  it('uses the physically proven bounded no-think profile for text Qwen3 candidates', () => {
    const profile = resolveAstraCertificationExecutionProfile('reasoning', 'qwen3:8b-q4_K_M')
    expect(ASTRA_CERTIFICATION_PROVENANCE_VERSION).toBe(5)
    expect(profile).toEqual({
      id: 'blackstar-astra-native-qwen3-bounded-v3',
      maxTokens: 1024,
      timeoutMs: 60_000,
      reasoningMode: 'disabled',
      reasoningEffort: 'none',
      maxAttempts: 1,
      promptSuffix: '/no_think',
      fallback: false,
    })
    expect(buildAstraCertificationExecutionPrompt('Canonical benchmark', profile)).toBe('Canonical benchmark\n\n/no_think')
  })

  it('uses bounded low reasoning and one attempt for text GPT-OSS 20B candidates', () => {
    for (const model of ['gpt-oss-20b', 'ggml-org/gpt-oss-20b-GGUF']) {
      const profile = resolveAstraCertificationExecutionProfile('reasoning', model)
      expect(profile).toEqual({
        id: 'blackstar-astra-native-gptoss20b-bounded-v2',
        maxTokens: 512,
        timeoutMs: 60_000,
        reasoningMode: 'low',
        reasoningEffort: 'low',
        maxAttempts: 1,
        promptSuffix: null,
        fallback: false,
      })
      expect(buildAstraCertificationExecutionPrompt('Canonical benchmark', profile)).toBe('Canonical benchmark')
    }
  })

  it('keeps vision and other models on the exact pinned default profile', () => {
    const vision = resolveAstraCertificationExecutionProfile('vision', 'gpt-oss-20b')
    const other = resolveAstraCertificationExecutionProfile('coding', 'other-compatible-model')
    for (const profile of [vision, other]) {
      expect(profile.maxTokens).toBe(1600)
      expect(profile.timeoutMs).toBe(90_000)
      expect(profile.reasoningEffort).toBeNull()
      expect(profile.maxAttempts).toBe(3)
      expect(profile.promptSuffix).toBeNull()
      expect(profile.fallback).toBe(false)
    }
  })

  it('detects execution-control and execution-prompt tampering', () => {
    const profile = resolveAstraCertificationExecutionProfile('general', 'gpt-oss-20b')
    expect(sameAstraCertificationExecutionProfile({ ...profile }, profile)).toBe(true)
    expect(sameAstraCertificationExecutionProfile({ ...profile, timeoutMs: 90_000 }, profile)).toBe(false)
    expect(sameAstraCertificationExecutionProfile({ ...profile, reasoningEffort: null }, profile)).toBe(false)
    expect(sameAstraCertificationExecutionProfile({ ...profile, maxAttempts: 3 }, profile)).toBe(false)
    expect(hashAstraCertificationExecutionPrompt(buildAstraCertificationExecutionPrompt('A', profile)))
      .not.toBe(hashAstraCertificationExecutionPrompt(buildAstraCertificationExecutionPrompt('B', profile)))
  })
})
