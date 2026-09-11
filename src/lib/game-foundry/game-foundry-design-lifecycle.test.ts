import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions = readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool = readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')
const migration = readFileSync('supabase/migrations/20260911214500_game_foundry_design_planning.sql','utf8')

describe('Game Foundry design lifecycle', () => {
  it('adds an explicit planned state before build execution', () => {
    expect(migration).toContain("'planned'")
    expect(functions).toContain('status:"planning"')
    expect(functions).toContain('status:"planned"')
    expect(functions).toContain('Generate and review the Game Foundry design plan before starting the game build.')
  })

  it('preserves the Blackstar-compiled design through the worker handoff', () => {
    expect(functions).toContain('designSpec:project.data.design_spec')
    expect(functions).toContain('design_spec:project.data.design_spec')
    expect(functions).toContain('worker_design_spec:worker.designSpec')
  })

  it('gives agents the same create-plan-build lifecycle', () => {
    expect(tool).toContain('"plan_project"')
    expect(tool).toContain('generateGameFoundryDesign')
    expect(tool).toContain('Plan the Game Foundry project before generation.')
  })
})
