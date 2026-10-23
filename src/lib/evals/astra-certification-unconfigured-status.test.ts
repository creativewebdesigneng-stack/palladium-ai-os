import { afterEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: mocked.from, rpc: mocked.rpc },
}))

import { certifyAstraEvaluation, getAstraEvaluationCertificationStatus } from './astra-evaluation-verifier.server'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

function noCandidate() {
  vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', '')
  vi.stubEnv('BLACKSTAR_NATIVE_MODEL', '')
  vi.stubEnv('BLACKSTAR_ASTRA_MODEL', '')
  vi.stubEnv('BLACKSTAR_ASTRA_REASONING_MODEL', '')
  vi.stubEnv('BLACKSTAR_ASTRA_VISION_MODEL', '')
  vi.stubEnv('GROQ_API_KEY', '')
}

describe('Astra certification status when candidate serving is absent', () => {
  it('returns a safe zero-evidence status instead of throwing in an unconfigured Preview', async () => {
    noCandidate()
    const status = await getAstraEvaluationCertificationStatus({
      userId: 'owner', orgId: null, taskClass: 'reasoning',
    })
    expect(status).toMatchObject({
      candidateConfigured: false,
      certificationSupported: false,
      readyToCertify: false,
      qualityFloorMet: false,
      averageScore: null,
      completedRuns: 0,
    })
    expect(mocked.from).not.toHaveBeenCalled()
    expect(mocked.rpc).not.toHaveBeenCalled()
  })

  it('continues to prohibit certification issuance without a pinned native candidate', async () => {
    noCandidate()
    await expect(certifyAstraEvaluation({
      userId: 'owner', orgId: null, taskClass: 'reasoning',
    })).rejects.toThrow(/pinned native Astra candidate route/)
    expect(mocked.rpc).not.toHaveBeenCalled()
    expect(mocked.from).not.toHaveBeenCalled()
  })

  it('keeps unconfigured vision certification non-certifiable', async () => {
    noCandidate()
    const status = await getAstraEvaluationCertificationStatus({
      userId: 'owner', orgId: null, taskClass: 'vision',
    })
    expect(status.readyToCertify).toBe(false)
    expect(status.certificationSupported).toBe(false)
    expect(status.completedRuns).toBe(0)
  })
})
