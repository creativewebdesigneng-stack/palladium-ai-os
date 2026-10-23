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

  it('rejects missing evaluator credentials before any persisted record or inference request', async () => {
    for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value)
    vi.stubEnv('FREELLMAPI_API_KEY', '')
    await expect(run()).rejects.toThrow(/FreeLLM evaluator/)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.runChatPinned).not.toHaveBeenCalled()
  })
})
