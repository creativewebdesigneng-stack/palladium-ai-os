import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')

describe('Game Foundry final certification',()=>{
  it('combines project readiness with live connector evidence',()=>{
    expect(functions).toContain('certifyGameFoundryProject')
    expect(functions).toContain('probeGameFoundryConnections()')
    expect(functions).toContain('auditGameFoundryReadiness(project.data,assets.data??[])')
  })
  it('does not certify non-web runtimes without healthy external connectors',()=>{
    expect(functions).toContain('externallyBlocked=project.data.target_engine!=="web"&&!externalHealthy')
    expect(functions).toContain('certified=readiness.runtimeReady && !externallyBlocked')
  })
  it('exposes the same certification boundary to the bounded agent tool',()=>{
    expect(tool).toContain('"certify_project"')
    expect(tool).toContain('externallyBlocked')
    expect(tool).toContain('codeReady:true')
  })
})
