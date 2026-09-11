import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  'supabase/migrations/20260911124000_harden_marketplace_anonymous_read.sql',
  'utf8',
)
const marketplace = readFileSync('src/lib/marketplace/marketplace.functions.ts', 'utf8')
const creators = readFileSync('src/lib/marketplace/creators.functions.ts', 'utf8')

describe('Marketplace anonymous-read hardening', () => {
  it('revokes legacy anonymous table reads', () => {
    expect(migration).toContain('revoke select on table public.marketplace_agents from anon')
    expect(migration).toContain('revoke select on table public.creator_profiles from anon')
  })

  it('limits catalogue/profile policies to authenticated users', () => {
    expect(migration).toContain('create policy ma_authenticated_published_read')
    expect(migration).toContain('to authenticated')
    expect(migration).toContain("using (status = 'published'::listing_status)")
    expect(migration).toContain('create policy cp_authenticated_read')
  })

  it('matches the current signed-in-only server boundaries', () => {
    expect(marketplace).toContain('.middleware([requireSupabaseAuth])')
    expect(creators).toContain('.middleware([requireSupabaseAuth])')
  })
})
