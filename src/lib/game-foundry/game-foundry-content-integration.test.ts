import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260911234500_game_foundry_content_compiler.sql','utf8')
const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')
const pkg=readFileSync('src/lib/game-foundry/game-foundry-project-package.server.ts','utf8')

describe('Game Foundry content compiler integration',()=>{
  it('stores content on the existing project',()=>{
    expect(migration).toContain('alter table public.game_foundry_projects')
    expect(migration).toContain('content_manifest')
    expect(migration).not.toContain('create table')
  })
  it('feeds approved content into source generation and portable packages',()=>{
    expect(functions).toContain('Compiled gameplay/world content:')
    expect(pkg).toContain('content:input.project.content_manifest')
  })
  it('exposes content generation to the bounded agent tool',()=>{
    expect(tool).toContain('"generate_content"')
    expect(tool).toContain('generateGameFoundryContent')
  })
})
