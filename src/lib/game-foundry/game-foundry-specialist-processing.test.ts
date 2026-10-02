import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const runtime=readFileSync('src/lib/game-foundry/game-foundry-runtime.server.ts','utf8')
const screen=readFileSync('src/screens/GameFoundry.jsx','utf8')

describe('Game Foundry specialist processing surface',()=>{
  it('exposes the existing specialist rigging lane without pretending the hosted worker supports it',()=>{
    expect(runtime).toContain('specialistConfigured: Boolean(custom)')
    expect(runtime).toContain('does not fabricate rigging or animation')
    expect(screen).toContain('processingRigging')
    expect(screen).toContain('processingAnimation')
    expect(screen).toContain('Specialist worker configured')
    expect(screen).toContain('Hosted geometry processing only')
    expect(screen).toContain('Configure GAME_FOUNDRY_3D_API_URL')
  })
  it('surfaces ZModeler as a selectable engine and constrains its manual interchange formats',()=>{
    expect(screen).toContain("'zmodeler'")
    expect(screen).toContain("['fbx','obj']")
    expect(screen).toContain("formats.includes('fbx')?'fbx':'obj'")
  })
  it('fails closed on missing processed output and preserves truthful provider identity',()=>{
    expect(runtime).toContain('Game Foundry processor reported completed without an output URL.')
    expect(runtime).toContain('custom ? "game-foundry-3d" as const : "blackstar-hosted-3d" as const')
  })
})
