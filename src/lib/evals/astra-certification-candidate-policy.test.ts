import { describe, expect, it } from 'vitest'
import { hasPinnedAstraCertificationCandidate as candidate } from './astra-certification-candidate-policy'

describe('Astra certification separates provider bootstraps from pinned candidate routes', () => {
  it('rejects a Groq bootstrap even with working Groq credentials', () => {
    expect(candidate({ taskClass: 'reasoning', candidateModel: 'qwen/qwen3.8-27b',
      env: { GROQ_API_KEY: 'secret', BLACKSTAR_ASTRA_MODEL: 'qwen/qwen3.8-27b' } })).toBe(false)
  })
  it('rejects unpinned endpoints, placeholder model identity, and legacy Qwen aliases', () => {
    const env = { OPENAI_COMPATIBLE_BASE_URL: 'https://native.example/v1' }
    expect(candidate({ taskClass: 'general', candidateModel: 'placeholder', env })).toBe(false)
    expect(candidate({ taskClass: 'general', candidateModel: 'blackstar-astra-v0.1',
      env: { ...env, BLACKSTAR_ASTRA_MODEL: 'blackstar-astra-v0.1' } })).toBe(false)
    expect(candidate({ taskClass: 'general', candidateModel: 'qwen/qwen3.8-27b',
      env: { ...env, BLACKSTAR_NATIVE_MODEL: 'qwen/qwen3.8-27b' } })).toBe(false)
  })
  it('allows an attempt only when a real compatible endpoint has an exact candidate pin', () => {
    const env = { OPENAI_COMPATIBLE_BASE_URL: 'https://native.example/v1',
      BLACKSTAR_NATIVE_MODEL: 'native-weights-1' }
    expect(candidate({ taskClass: 'general', candidateModel: 'native-weights-1', env })).toBe(true)
    expect(candidate({ taskClass: 'general', candidateModel: 'other-weights', env })).toBe(false)
    expect(candidate({ taskClass: 'coding', candidateModel: 'coding-weights',
      env: { ...env, BLACKSTAR_ASTRA_CODING_MODEL: 'coding-weights' } })).toBe(true)
    expect(candidate({ taskClass: 'reasoning', candidateModel: 'coding-weights',
      env: { ...env, BLACKSTAR_ASTRA_CODING_MODEL: 'coding-weights' } })).toBe(false)
  })
})
