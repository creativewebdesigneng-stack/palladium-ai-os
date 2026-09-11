import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')
const audit=readFileSync('src/lib/game-foundry/game-foundry-readiness.server.ts','utf8')

describe('Game Foundry readiness integration',()=>{
  it('derives readiness only from persisted owner-scoped evidence',()=>{
    expect(functions).toContain('auditGameFoundryProjectReadiness')
    expect(functions).toContain('.eq("project_id",data.id).eq("user_id",context.userId)')
    expect(audit).toContain('It does not claim an external engine build or bridge succeeded')
  })
  it('exposes the same audit to the bounded agent tool',()=>{
    expect(tool).toContain('"audit_readiness"')
    expect(tool).toContain('auditGameFoundryReadiness')
  })
})
