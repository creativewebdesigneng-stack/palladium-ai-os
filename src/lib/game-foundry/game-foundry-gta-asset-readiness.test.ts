import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const source=readFileSync(resolve(process.cwd(),'src/lib/game-foundry/game-foundry.functions.ts'),'utf8')
describe('GTA V asset assessment endpoint',()=>{
  it('enforces ownership and actual completed asset status',()=>{
    expect(source).toContain('export const assessGameFoundryGtaVehicleAsset')
    expect(source).toContain('.eq("id",data.assetId).eq("user_id",context.userId)')
    expect(source).toContain('asset.status!=="completed"||!asset.output_url')
  })
  it('fails closed when worker supplies no vehicle manifest',()=>{
    expect(source).toContain('Worker has not supplied a GTA V vehicle handoff manifest')
    expect(source).toContain('assessGtaVehicleHandoff(candidate)')
  })
})
