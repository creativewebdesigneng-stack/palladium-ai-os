import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260912001000_game_foundry_content_assets.sql','utf8')
const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')

describe('Game Foundry content-driven 3D assets',()=>{
  it('links each canonical 3D job to one approved content requirement',()=>{
    expect(migration).toContain('content_requirement_id')
    expect(migration).toContain('three_d_jobs_project_requirement_unique')
    expect(functions).toContain('content_requirement_id:String(requirement.id)')
  })
  it('bounds automatic 3D generation and excludes non-3D requirement kinds',()=>{
    expect(functions).toContain('max(8)')
    expect(functions).toContain('environment","character","prop","vehicle","weapon')
    expect(functions).toContain('.slice(0,data.limit)')
  })
  it('prevents duplicate requirement jobs and reuses canonical workers',()=>{
    expect(functions).toContain('already have linked 3D jobs')
    expect(functions).toContain('submitGameFoundryAsset')
    expect(tool).toContain('"generate_required_assets"')
  })
})
