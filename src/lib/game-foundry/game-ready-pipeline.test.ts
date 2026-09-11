import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260911221500_game_foundry_game_ready_pipeline.sql','utf8')
const functions = readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool = readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')

describe('Game Foundry game-ready pipeline integration', () => {
  it('extends canonical three_d_jobs instead of introducing another job store', () => {
    expect(migration).toContain('alter table public.three_d_jobs')
    expect(migration).not.toContain('create table if not exists public.game_foundry_processing_jobs')
  })
  it('persists processing profile and validation evidence', () => {
    expect(migration).toContain('processing_profile')
    expect(migration).toContain('validation_report')
    expect(functions).toContain('submitGameReadyProcessing')
  })
  it('exposes the same processing action to agents', () => {
    expect(tool).toContain('"process_asset"')
    expect(tool).toContain('submitGameReadyProcessing')
  })
})
