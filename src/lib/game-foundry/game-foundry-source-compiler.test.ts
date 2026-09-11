import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const builder=readFileSync('src/lib/builder/builder-source.server.ts','utf8')
const migration=readFileSync('supabase/migrations/20260911225500_game_foundry_source_compiler.sql','utf8')

describe('Game Foundry bounded source compiler',()=>{
  it('reuses the hardened Builder source generator',()=>{
    expect(functions).toContain('generateBuilderSourceManifest')
    expect(builder).toContain('Unsafe source file path.')
    expect(builder).toContain('Generated source exceeds the Builder manifest size limit.')
  })
  it('persists source on the existing game project',()=>{
    expect(migration).toContain('alter table public.game_foundry_projects')
    expect(migration).toContain('source_manifest')
    expect(migration).not.toContain('create table')
  })
  it('does not represent binary engine artifacts as generated source',()=>{
    expect(functions).toContain('Do not claim Blueprint assets, .uasset files or compiled binaries exist.')
    expect(functions).toContain('Do not claim a .blend binary was created.')
    expect(functions).toContain('Linked 3D assets are managed separately')
  })
})
