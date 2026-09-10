import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@/lib/runtime/model-gateway.server', () => ({
  runChatPinned: vi.fn(),
}))

describe('Astra trusted text certification runner contract', () => {
  it('keeps the runtime controls in the signed execution profile module', async () => {
    const { resolveAstraCertificationExecutionProfile } = await import('./astra-certification-execution-profile')
    const profile = resolveAstraCertificationExecutionProfile('reasoning', 'ggml-org/gpt-oss-20b-GGUF')
    expect(profile.reasoningEffort).toBe('low')
    expect(profile.maxAttempts).toBe(1)
    expect(profile.timeoutMs).toBe(60_000)
    expect(profile.maxTokens).toBe(512)
    expect(profile.fallback).toBe(false)
  })
})
