import { afterEach, describe, expect, it } from 'vitest'
import { normaliseProvider, resolveModel } from '../model-gateway.base'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('Blackstar self-hosted primary routing policy', () => {
  it('prefers the compatible Blackstar-controlled runtime when explicitly enabled and configured', () => {
    process.env['BLACKSTAR_NATIVE_PRIMARY'] = 'true'
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://127.0.0.1:11434/v1'
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
    process.env['GROQ_API_KEY'] = 'fallback-only'

    expect(normaliseProvider()).toBe('compatible')
    expect(resolveModel('compatible', null)).toBe('qwen3:8b-q4_K_M')
  })

  it('does not switch to compatible merely because an evaluation endpoint exists', () => {
    delete process.env['BLACKSTAR_NATIVE_PRIMARY']
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://evaluation-provider.example/v1'
    process.env['GROQ_API_KEY'] = 'configured'

    expect(normaliseProvider()).toBe('groq')
  })

  it('requires a configured compatible endpoint before the native-primary opt-in can take effect', () => {
    process.env['BLACKSTAR_NATIVE_PRIMARY'] = 'true'
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    process.env['OPENAI_API_KEY'] = 'configured'

    expect(normaliseProvider()).toBe('openai')
  })

  it('preserves an explicit provider selection even when native-primary mode is enabled', () => {
    process.env['BLACKSTAR_NATIVE_PRIMARY'] = 'true'
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://127.0.0.1:11434/v1'

    expect(normaliseProvider('openai')).toBe('openai')
    expect(normaliseProvider('groq')).toBe('groq')
  })
})
