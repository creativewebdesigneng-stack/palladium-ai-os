import { describe, expect, it } from 'vitest'
import { loadAiHubRuntimeTargetRegistry } from '../runtime-targets.server'

function fakeSupabase(rows: Array<Record<string, unknown>>) {
  return {
    from: () => ({
      select: () => ({
        is: async () => ({ data: rows, error: null }),
      }),
    }),
  }
}

describe('persisted AI Hub runtime target registry', () => {
  it('loads only attested rows for the requested tenant', async () => {
    const sb = fakeSupabase([
      {
        id: 'target-a',
        user_id: 'tenant-a',
        org_id: null,
        deployment_target: 'on-prem',
        region: 'uk',
        health: 'healthy',
        attested_at: '2026-10-01T19:00:00.000Z',
        expires_at: '2026-10-01T22:00:00.000Z',
        updated_at: '2026-10-01T19:00:00.000Z',
        metadata: {},
      },
      {
        id: 'target-b',
        user_id: 'tenant-b',
        org_id: null,
        deployment_target: 'on-prem',
        region: 'uk',
        health: 'healthy',
        attested_at: '2026-10-01T19:00:00.000Z',
        expires_at: '2026-10-01T22:00:00.000Z',
        updated_at: '2026-10-01T19:00:00.000Z',
        metadata: {},
      },
      {
        id: 'unattested-a',
        user_id: 'tenant-a',
        org_id: null,
        deployment_target: 'edge',
        region: null,
        health: 'offline',
        attested_at: null,
        expires_at: null,
        updated_at: '2026-10-01T19:00:00.000Z',
        metadata: {},
      },
    ])

    const registry = await loadAiHubRuntimeTargetRegistry(sb, 'tenant-a')
    expect(registry.list('tenant-a').map((target) => target.id)).toEqual(['target-a'])
  })

  it('uses organisation identity as the tenant boundary when present', async () => {
    const sb = fakeSupabase([
      {
        id: 'org-edge',
        user_id: 'user-a',
        org_id: 'org-a',
        deployment_target: 'edge',
        region: 'uk',
        health: 'healthy',
        attested_at: '2026-10-01T19:00:00.000Z',
        expires_at: '2026-10-01T22:00:00.000Z',
        updated_at: '2026-10-01T19:00:00.000Z',
        metadata: {},
      },
    ])

    const registry = await loadAiHubRuntimeTargetRegistry(sb, 'org-a')
    expect(registry.list('org-a')[0]?.id).toBe('org-edge')
    expect(registry.list('user-a')).toEqual([])
  })
})
