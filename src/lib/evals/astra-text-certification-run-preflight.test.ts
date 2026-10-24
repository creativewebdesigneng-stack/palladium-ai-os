import { afterEach, describe, expect, it, vi } from 'vitest'

const fake = vi.hoisted(() => ({ from: vi.fn(), runChatPinned: vi.fn() }))
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: fake.from },
}))
vi.mock('@/lib/runtime/model-gateway.server', () => ({
  runChatPinned: fake.runChatPinned,
}))

import { runTrustedAstraTextCertificationCase } from './astra-text-certification-run.server'
import { listAstraCertificationBenchmarkCases } from './astra-certification-benchmark-suite'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Astra trusted runner gates independent evaluation before spending or persistence', () => {
  const baseEnv = {
    OPENAI_COMPATIBLE_BASE_URL: 'https://candidate.invalid/v1',
    OPENAI_COMPATIBLE_API_KEY: 'candidate-test-token',
    BLACKSTAR_ASTRA_MODEL: 'candidate-model',
    FREELLMAPI_BASE_URL: 'https://evaluator.invalid/v1',
    FREELLMAPI_API_KEY: 'never-log-me',
    FREELLMAPI_MODEL: 'judge-identity',
    FREELLMAPI_ROUTED_PROVIDER: 'openai',
    FREELLMAPI_ROUTED_MODEL: 'distinct-upstream-model',
  } as const

  const run = () => runTrustedAstraTextCertificationCase({
    userId: 'test-user',
    taskClass: 'reasoning',
    caseId: listAstraCertificationBenchmarkCases('reasoning')[0]!.caseId,
  })

  it('rejects a Groq-only Qwen bootstrap without charging, recording or certifying it as Blackstar-native', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', '')
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'qwen/qwen3.8-27b')
    vi.stubEnv('BLACKSTAR_NATIVE_MODEL', '')
    vi.stubEnv('GROQ_API_KEY', 'mock-development-bootstrap')
    await expect(run()).rejects.toThrow(/independent FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })

  it('rejects an unpinned compatible endpoint even if the judge is correctly configured', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'blackstar-astra-v0.1')
    vi.stubEnv('BLACKSTAR_NATIVE_MODEL', '')
    await expect(run()).rejects.toThrow(/independent FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })

  it('does not create a run or call the model when the judge resolves to the candidate model', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('FREELLMAPI_ROUTED_MODEL', 'candidate-model')
    await expect(run()).rejects.toThrow(/independent FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })

  it('also rejects an auto-route before any persisted record or inference request', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('FREELLMAPI_ROUTED_PROVIDER', 'auto')
    await expect(run()).rejects.toThrow(/independent FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })

  it('rejects missing signing authority before charging the model or creating a run', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('BLACKSTAR_NATIVE_MODEL', '')
    vi.stubEnv('BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    await expect(run()).rejects.toThrow(/provenance signing authority is missing or invalid/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })

  it('rejects missing evaluator credentials before any persisted record or inference request', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('FREELLMAPI_API_KEY', '')
    await expect(run()).rejects.toThrow(/FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })
})
