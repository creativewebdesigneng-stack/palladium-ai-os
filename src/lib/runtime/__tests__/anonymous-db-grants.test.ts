import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  'supabase/migrations/20260911125000_revoke_legacy_anon_table_grants.sql',
  'utf8',
)

describe('anonymous public-schema privilege baseline', () => {
  it('revokes legacy anonymous table and sequence privileges', () => {
    expect(migration).toContain('revoke all privileges on all tables in schema public from anon')
    expect(migration).toContain('revoke all privileges on all sequences in schema public from anon')
  })

  it('restores only the intentional public pricing read', () => {
    expect(migration).toContain('grant select on table public.plans to anon')
    expect(migration).not.toMatch(/grant .*marketplace_agents.* anon/i)
    expect(migration).not.toMatch(/grant .*creator_profiles.* anon/i)
  })

  it('documents that published apps use the narrow RPC instead of table grants', () => {
    expect(migration).toContain('get_published_app_studio_release')
  })
})
