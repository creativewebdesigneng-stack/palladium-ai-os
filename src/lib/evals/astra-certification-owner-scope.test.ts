import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: mocked.from },
}))

import { getAstraEvaluationCertificationStatus } from './astra-evaluation-verifier.server'
import { attestAstraCertificationBenchmarkRun } from './astra-certification-benchmark.server'
import { listAstraCertificationBenchmarkCases } from './astra-certification-benchmark-suite'

const owner = 'owner-a'
const other = 'owner-b'
const workspace = 'same-organisation'

function membership() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
  }
}

beforeEach(() => {
  vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', 'https://candidate.invalid/v1')
  vi.stubEnv('BLACKSTAR_ASTRA_MODEL', 'test-native-candidate')
  vi.stubEnv('BLACKSTAR_NATIVE_MODEL', 'test-native-candidate')
  vi.stubEnv('BLACKSTAR_ASTRA_REASONING_MODEL', '')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Astra certification requires an exact evaluation owner even inside an organisation', () => {
  it('adds user ID and organisation ID filters before retrieving historical certification runs', async () => {
    const calls: Array<[string, string]> = []
    const history = {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((key: string, value: string) => {
        calls.push([key, value])
        return history
      }),
      range: vi.fn().mockReturnThis(),
      // PostgREST's range() remains a query builder until awaited.
      then: vi.fn((resolve: (value: { data: never[]; error: null }) => void) => {
        resolve({ data: [], error: null })
      }),
    }
    mocked.from.mockImplementation((table: string) => {
      if (table === 'organisation_members') return membership()
      if (table === 'model_eval_runs') return history
      throw new Error('Unexpected certification table access: ' + table)
    })
    const status = await getAstraEvaluationCertificationStatus({
      userId: owner, orgId: workspace, taskClass: 'reasoning',
    })
    expect(calls).toContainEqual(['user_id', owner])
    expect(calls).toContainEqual(['org_id', workspace])
    expect(history.range).toHaveBeenCalledOnce()
    expect(status.completedRuns).toBe(0)
    expect(status.readyToCertify).toBe(false)
  })

  it('rejects a signed-looking run belonging to another member of the same organisation', async () => {
    const benchmark = listAstraCertificationBenchmarkCases('reasoning')[0]!
    const run = {
      id: 'run-owned-by-other-member',
      user_id: other,
      org_id: workspace,
      status: 'completed',
      completed_at: new Date(0).toISOString(),
      prompt: benchmark.prompt,
      metadata: { astra_activation: { server_verified: true } },
    }
    const dbRun = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: run, error: null }),
    }
    mocked.from.mockImplementation((table: string) => {
      if (table === 'organisation_members') return membership()
      if (table === 'model_eval_runs') return dbRun
      throw new Error('Unowned case should never load evidence: ' + table)
    })
    await expect(attestAstraCertificationBenchmarkRun({
      userId: owner, orgId: workspace, taskClass: 'reasoning',
      runId: run.id, caseId: benchmark.caseId,
    })).rejects.toThrow(/exact owner\/workspace scope/)
    expect(mocked.from.mock.calls.map(([table]) => table)).toEqual([
      'organisation_members', 'model_eval_runs',
    ])
  })
})
