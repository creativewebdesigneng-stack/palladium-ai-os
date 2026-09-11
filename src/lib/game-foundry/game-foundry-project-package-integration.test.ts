import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260911232000_game_foundry_project_package.sql','utf8')
const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')

describe('Game Foundry project package integration',()=>{
  it('stores package state on the existing project',()=>{
    expect(migration).toContain('alter table public.game_foundry_projects')
    expect(migration).toContain('package_manifest')
    expect(migration).not.toContain('create table')
  })
  it('prepares packages only for owner-scoped projects with generated source',()=>{
    expect(functions).toContain('.eq("id",data.id).eq("user_id",context.userId)')
    expect(functions).toContain('source_status!=="generated"')
    expect(functions).toContain('buildGameFoundryProjectPackage')
  })
  it('exposes package preparation to agents without a second runtime',()=>{
    expect(tool).toContain('"prepare_package"')
    expect(tool).toContain('buildGameFoundryProjectPackage')
  })
})
