import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260911210000_blackstar_game_foundry_foundation.sql','utf8')
const tools = readFileSync('src/lib/runtime/tools.server.ts','utf8')

describe('Blackstar Game Foundry integration contract', () => {
  it('keeps projects owner-scoped and anonymous access revoked', () => {
    expect(migration).toContain('alter table public.game_foundry_projects enable row level security')
    expect(migration).toContain('to authenticated')
    expect(migration).toContain('auth.uid() = user_id')
    expect(migration).toContain('revoke all privileges on table public.game_foundry_projects from anon')
  })

  it('reuses the existing 3D job store instead of creating a duplicate asset-job table', () => {
    expect(migration).toContain('alter table public.three_d_jobs')
    expect(migration).not.toContain('create table if not exists public.game_foundry_asset_jobs')
  })

  it('registers the bounded Game Foundry tool in the canonical runtime', () => {
    expect(tools).toContain('GAME_FOUNDRY_TOOL_DEF')
    expect(tools).toContain('"game_foundry"')
    expect(tools).toContain('runGameFoundryTool')
  })
})
