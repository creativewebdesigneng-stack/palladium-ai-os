import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/game-foundry/game-foundry.functions.ts','utf8')
const tool=readFileSync('src/lib/game-foundry/game-foundry-agent-tool.server.ts','utf8')
const integrations=readFileSync('src/lib/game-foundry/game-foundry-integrations.server.ts','utf8')

describe('Game Foundry connector health integration',()=>{
  it('probes only server-configured endpoints with bounded redirects/timeouts',()=>{
    expect(integrations).toContain('process.env[target.env]')
    expect(integrations).toContain('redirect:"error"')
    expect(integrations).toContain('AbortSignal.timeout(8000)')
  })
  it('exposes authenticated and agent health checks',()=>{
    expect(functions).toContain('checkGameFoundryConnections')
    expect(tool).toContain('"connection_health"')
    expect(tool).toContain('probeGameFoundryConnections')
  })
})
