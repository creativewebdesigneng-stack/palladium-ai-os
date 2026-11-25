import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ runChatPinned: vi.fn() }))

vi.mock('@/lib/runtime/model-gateway.server', () => ({
  runChatPinned: mocks.runChatPinned,
}))

import {
  getAstraXRuntimeConfiguration,
  runAstraXNativeChat,
} from '../astra-x-runtime.server'

const envKeys = [
  'BLACKSTAR_NATIVE_PRIMARY',
  'BLACKSTAR_NATIVE_MODEL',
  'OPENAI_COMPATIBLE_BASE_URL',
  'OPENAI_COMPATIBLE_API_KEY',
  'ASTRA_X_LOCAL_BRIDGE_ATTESTED',
] as const
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]))

beforeEach(() => {
  process.env['BLACKSTAR_NATIVE_PRIMARY'] = 'true'
  process.env['BLACKSTAR_NATIVE_MODEL'] = 'qwen3:8b-q4_K_M'
  process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://127.0.0.1:12780/v1'
  delete process.env['OPENAI_COMPATIBLE_API_KEY']
  delete process.env['ASTRA_X_LOCAL_BRIDGE_ATTESTED']
  mocks.runChatPinned.mockReset()
  mocks.runChatPinned.mockResolvedValue({
    text: 'local response',
    toolCalls: [],
    usage: { input: 3, output: 2 },
    provider: 'compatible',
    model: 'qwen3:8b-q4_K_M',
  })
})

afterEach(() => {
  for (const key of envKeys) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('Astra X Blackstar gateway bridge', () => {
  it('does not report configured when the native runtime flag is off', () => {
    expect(getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'false',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'http://127.0.0.1:12780/v1',
    })).toBeNull()
  })

  it('accepts a loopback endpoint without a bearer key', () => {
    expect(getAstraXRuntimeConfiguration()).toMatchObject({
      configured: true,
      provider: 'compatible',
      model: 'qwen3:8b-q4_K_M',
      endpointIsLoopback: true,
    })
  })

  it('requires HTTPS and a server bearer key for a remote tunnel endpoint', () => {
    expect(() => getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'true',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'http://bridge.example.test/v1',
      OPENAI_COMPATIBLE_API_KEY: 'secret',
    })).toThrow('requires HTTPS')

    expect(() => getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'true',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'https://bridge.example.test/v1',
      OPENAI_COMPATIBLE_API_KEY: 'secret',
    })).toThrow('ASTRA_X_LOCAL_BRIDGE_ATTESTED=true')

    expect(getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'true',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'https://bridge.example.test/v1',
      OPENAI_COMPATIBLE_API_KEY: 'secret',
      ASTRA_X_LOCAL_BRIDGE_ATTESTED: 'true',
    })).toMatchObject({
      configured: true,
      endpointIsLoopback: false,
    })
  })

  it('rejects credentials and query strings embedded in the endpoint URL', () => {
    expect(() => getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'true',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'http://user:pass@localhost:12780/v1',
    })).toThrow('violates the provider URL policy')
    expect(() => getAstraXRuntimeConfiguration({
      BLACKSTAR_NATIVE_PRIMARY: 'true',
      BLACKSTAR_NATIVE_MODEL: 'qwen3:8b-q4_K_M',
      OPENAI_COMPATIBLE_BASE_URL: 'http://localhost:12780/v1?token=secret',
    })).toThrow('violates the provider URL policy')
  })

  it('uses the existing pinned compatible gateway with tools disabled', async () => {
    const result = await runAstraXNativeChat({
      messages: [
        { role: 'system', content: 'You are Astra X.' },
        { role: 'user', content: 'Explain local-first inference.' },
      ],
      maxTokens: 256,
    })

    expect(result.text).toBe('local response')
    expect(mocks.runChatPinned).toHaveBeenCalledOnce()
    expect(mocks.runChatPinned).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'compatible',
      model: 'qwen3:8b-q4_K_M',
      temperature: 0,
      maxTokens: 256,
      tools: [],
    }))
  })

  it('does not try another provider when the pinned native gateway fails', async () => {
    mocks.runChatPinned.mockRejectedValue(new Error('local endpoint unavailable'))
    await expect(runAstraXNativeChat({
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('local endpoint unavailable')
    expect(mocks.runChatPinned).toHaveBeenCalledOnce()
  })

  it('rejects tool messages and requests without a user message', async () => {
    await expect(runAstraXNativeChat({
      messages: [{ role: 'tool' as never, content: 'tool output' }],
    })).rejects.toThrow('supported roles')
    await expect(runAstraXNativeChat({
      messages: [{ role: 'system', content: 'system only' }],
    })).rejects.toThrow('at least one user message')
  })

  it('rejects unbounded request settings before calling the gateway', async () => {
    await expect(runAstraXNativeChat({
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 5000,
    })).rejects.toThrow('maxTokens')
    await expect(runAstraXNativeChat({
      messages: [{ role: 'user', content: 'test' }],
      timeoutMs: 500,
    })).rejects.toThrow('timeoutMs')
    expect(mocks.runChatPinned).not.toHaveBeenCalled()
  })

  it('rejects a gateway response with a different model identity', async () => {
    mocks.runChatPinned.mockResolvedValue({
      text: 'unexpected',
      toolCalls: [],
      usage: { input: 1, output: 1 },
      provider: 'openai',
      model: 'gpt-5-mini',
    })
    await expect(runAstraXNativeChat({
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('unexpected provider or model identity')
  })
})
