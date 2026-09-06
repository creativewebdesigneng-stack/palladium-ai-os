import { afterEach, describe, expect, it } from 'vitest'
import { chatBody } from '../model-gateway.base'
import {
  BLACKSTAR_NATIVE_INFERENCE_PROFILE,
  blackstarNativeModelDescriptor,
  isBlackstarNativeInferenceConfigured,
} from '../blackstar-native-inference-profile'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('Blackstar Native Intelligence inference profile', () => {
  it('reuses the existing OpenAI-compatible gateway rather than creating a parallel transport', () => {
    expect(BLACKSTAR_NATIVE_INFERENCE_PROFILE).toMatchObject({
      ownership: 'blackstar',
      protocol: 'openai-compatible',
      palladiumProvider: 'compatible',
      baseUrlEnv: 'OPENAI_COMPATIBLE_BASE_URL',
      apiKeyEnv: 'OPENAI_COMPATIBLE_API_KEY',
      chatPath: '/chat/completions',
      routingAuthority: 'evaluation-only',
      executionAuthority: 'none',
    })
  })

  it('exposes a candidate Blackstar-owned descriptor without claiming unsupported vision capability', () => {
    const descriptor = blackstarNativeModelDescriptor()

    expect(descriptor).toMatchObject({
      id: 'blackstar-native-v0.1',
      provider: 'compatible',
      ownership: 'blackstar',
      lifecycle: 'candidate',
      streaming: true,
    })
    expect(descriptor.capabilities).toEqual(
      expect.arrayContaining(['text', 'reasoning', 'coding', 'tools', 'structured_output']),
    )
    expect(descriptor.capabilities).not.toContain('vision')
  })

  it('uses the configured native serving model name without exposing endpoint credentials', () => {
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'blackstar-reasoning-7b-v1'
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://native.example.test/v1'
    process.env['OPENAI_COMPATIBLE_API_KEY'] = 'server-secret-key'

    const descriptor = blackstarNativeModelDescriptor()
    const rendered = JSON.stringify(descriptor)

    expect(descriptor.model).toBe('blackstar-reasoning-7b-v1')
    expect(isBlackstarNativeInferenceConfigured()).toBe(true)
    expect(rendered).not.toContain('native.example.test')
    expect(rendered).not.toContain('server-secret-key')
  })

  it('is not considered configured unless a serving endpoint exists', () => {
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    process.env['OPENAI_COMPATIBLE_API_KEY'] = 'key-without-server'

    expect(isBlackstarNativeInferenceConfigured()).toBe(false)
  })

  it('uses the existing production chat and function-calling request contract', () => {
    const descriptor = blackstarNativeModelDescriptor('blackstar-native-test')
    const body = chatBody(
      {
        provider: descriptor.provider,
        model: descriptor.model,
        messages: [{ role: 'user', content: 'Inspect the deployment and report the result.' }],
        tools: [{
          name: 'inspect_deployment',
          description: 'Inspect a deployment',
          parameters: {
            type: 'object',
            properties: { deployment_id: { type: 'string' } },
            required: ['deployment_id'],
          },
        }],
        maxTokens: 512,
      },
      false,
    ) as Record<string, any>

    expect(body.model).toBe('blackstar-native-test')
    expect(body.messages).toEqual([
      { role: 'user', content: 'Inspect the deployment and report the result.' },
    ])
    expect(body.max_tokens).toBe(512)
    expect(body.tools?.[0]).toMatchObject({
      type: 'function',
      function: { name: 'inspect_deployment' },
    })
  })

  it('keeps model selection separate from all execution authority', () => {
    expect(JSON.stringify(BLACKSTAR_NATIVE_INFERENCE_PROFILE)).not.toMatch(
      /approval_granted|tool_grant|permission_grant|delegation_grant/i,
    )
    expect(BLACKSTAR_NATIVE_INFERENCE_PROFILE.executionAuthority).toBe('none')
  })
})
