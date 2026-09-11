import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')
const runtime=readFileSync('src/lib/game-foundry/game-foundry-runtime.server.ts','utf8')

describe('Game Foundry worker refresh integration',()=>{
  it('persists exact provider identity for future refreshes',()=>{
    expect(functions).toContain('provider:worker.provider')
    expect(runtime).toContain('provider:"modly-compatible"')
    expect(runtime).toContain('provider:"game-foundry-3d"')
  })
  it('adds owner-scoped refresh APIs for assets, builds and handoffs',()=>{
    expect(functions).toContain('refreshGameFoundryAsset')
    expect(functions).toContain('refreshGameFoundryProjectBuild')
    expect(functions).toContain('refreshGameFoundryEngineHandoff')
    expect(functions).toContain('.eq("user_id",context.userId)')
  })
  it('exposes the same refresh lifecycle to agents',()=>{
    expect(tool).toContain('"refresh_asset"')
    expect(tool).toContain('"refresh_project"')
    expect(tool).toContain('"refresh_handoff"')
  })
})
