import { afterEach, describe, expect, it } from 'vitest'
import {
  BLACKSTAR_ASTRA_ENGINE_PROFILE,
  blackstarAstraModelDescriptor,
  blackstarAstraModelForTaskClass,
  isBlackstarAstraServingIdentity,
} from '../blackstar-astra-engine-profile'

afterEach(() => {
  delete process.env['OPENAI_COMPATIBLE_BASE_URL']
  delete process.env['BLACKSTAR_NATIVE_MODEL']
  delete process.env['GROQ_API_KEY']
  delete process.env['BLACKSTAR_ASTRA_MODEL']
  delete process.env['BLACKSTAR_ASTRA_REASONING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_CODING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL']
})

describe('Blackstar Astra specialist model profile', () => {
  it('falls back every task class to the base Astra model when specialists are not configured', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    expect(blackstarAstraModelForTaskClass('reasoning')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('coding')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('agentic')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('general')).toBe('astra-base-v1')
  })

  it('inherits the exact configured native model when Astra uses the native compatible route', () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://native.example/v1'
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
    expect(blackstarAstraModelDescriptor().model).toBe('qwen3:8b-q4_K_M')
    expect(blackstarAstraModelForTaskClass('reasoning')).toBe('qwen3:8b-q4_K_M')
    expect(isBlackstarAstraServingIdentity('compatible', 'qwen3:8b-q4_K_M')).toBe(true)
  })

  it('treats the legacy synthetic Astra engine id as unset on the native route', () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://native.example/v1'
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
    process.env['BLACKSTAR_ASTRA_MODEL'] = BLACKSTAR_ASTRA_ENGINE_PROFILE.defaultModel
    expect(blackstarAstraModelDescriptor().model).toBe('qwen3:8b-q4_K_M')
    expect(isBlackstarAstraServingIdentity('compatible', 'qwen3:8b-q4_K_M')).toBe(true)
    expect(isBlackstarAstraServingIdentity('compatible', BLACKSTAR_ASTRA_ENGINE_PROFILE.defaultModel)).toBe(false)
  })

  it('keeps a real explicit Astra base model pinned ahead of the shared native model', () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://native.example/v1'
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    expect(blackstarAstraModelDescriptor().model).toBe('astra-base-v1')
  })

  it('does not borrow a native model identity when the native compatible route is absent', () => {
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
    process.env['GROQ_API_KEY'] = 'configured-for-test'
    expect(blackstarAstraModelDescriptor().model).toBe(BLACKSTAR_ASTRA_ENGINE_PROFILE.groqBootstrapModel)
  })

  it('selects configured reasoning, coding and agentic specialists independently', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v1'
    process.env['BLACKSTAR_ASTRA_CODING_MODEL'] = 'astra-code-v1'
    process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL'] = 'astra-agent-v1'
    expect(blackstarAstraModelForTaskClass('reasoning')).toBe('astra-reason-v1')
    expect(blackstarAstraModelForTaskClass('coding')).toBe('astra-code-v1')
    expect(blackstarAstraModelForTaskClass('tool_use')).toBe('astra-agent-v1')
    expect(blackstarAstraModelForTaskClass('agentic')).toBe('astra-agent-v1')
    expect(blackstarAstraModelForTaskClass('general')).toBe('astra-base-v1')
  })

  it('recognises only currently configured Astra serving identities', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v1'
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-base-v1')).toBe(true)
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v1')).toBe(true)
    expect(isBlackstarAstraServingIdentity('openai', 'astra-reason-v1')).toBe(false)

    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v2'
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v1')).toBe(false)
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v2')).toBe(true)
  })
})
