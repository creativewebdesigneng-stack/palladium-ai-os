import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260911223500_game_foundry_engine_handoff.sql','utf8')
const functions = readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool = readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')

describe('Game Foundry project handoff integration', () => {
  it('persists manifest and handoff state on the existing project', () => {
    expect(migration).toContain('export_manifest')
    expect(migration).toContain('handoff_status')
    expect(migration).not.toContain('create table if not exists public.game_foundry_handoffs')
  })
  it('builds manifests only from owner-scoped linked assets', () => {
    expect(functions).toContain('.eq("project_id",data.id).eq("user_id",context.userId)')
    expect(functions).toContain('buildGameFoundryExportManifest')
  })
  it('exposes prepare/send handoff through the bounded agent tool', () => {
    expect(tool).toContain('"prepare_handoff"')
    expect(tool).toContain('"send_handoff"')
    expect(tool).toContain('submitGameFoundryBridgeHandoff')
  })
})
