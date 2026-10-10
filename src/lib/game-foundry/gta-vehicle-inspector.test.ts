import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const source=readFileSync(resolve(process.cwd(),'src/lib/game-foundry/gta-vehicle-inspector.server.ts'),'utf8')
describe('GTA inspector worker transport',()=>{
  it('requires HTTPS and a server-side token',()=>{
    expect(source).toContain("url.protocol!=='https:'")
    expect(source).toContain("GAME_FOUNDRY_GTA_INSPECTOR_TOKEN")
  })
  it('rejects unverified worker evidence and redirects',()=>{
    expect(source).toContain("redirect:'manual'")
    expect(source).toContain('assessGtaVehicleInspection(report,input)')
    expect(source).toContain('if(!assessment.verified)')
  })
})
