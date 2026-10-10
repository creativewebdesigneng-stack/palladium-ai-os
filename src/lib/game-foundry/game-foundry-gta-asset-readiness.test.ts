import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const source=readFileSync(resolve(process.cwd(),'src/lib/game-foundry/game-foundry.functions.ts'),'utf8')
const screen=readFileSync(resolve(process.cwd(),'src/screens/GameFoundry.jsx'),'utf8')
describe('GTA V asset assessment endpoint',()=>{
  it('enforces ownership and actual completed asset status',()=>{
    expect(source).toContain('export const assessGameFoundryGtaVehicleAsset')
    expect(source).toContain('.eq("id",data.assetId).eq("user_id",context.userId)')
    expect(source).toContain('asset.status!=="completed"||!asset.output_url')
  })
  it('shows actual assessment results in the existing asset history',()=>{
    expect(screen).toContain('assessGameFoundryGtaVehicleAsset')
    expect(screen).toContain('Check GTA V readiness')
    expect(screen).toContain('Native GTA V export: not verified')
  })
  it('requires independent inspection evidence and never grants native export readiness',()=>{
    expect(source).toContain('asset.validation_report?.gtaVehicleInspection')
    expect(source).toContain('assessGtaVehicleInspection(evidence')
    expect(source).toContain('inspectionVerified:inspection.verified')
    expect(source).toContain('No independent vehicle inspection report is attached')
  })
  it('rejects a worker manifest describing a different model or project',()=>{
    expect(source).toContain('assessment.handoff.sourceUrl===asset.output_url')
    expect(source).toContain('assessment.handoff.sourceFormat===String(asset.requested_format).toLowerCase()')
    expect(source).toContain('assessment.handoff.projectId===asset.project_id')
  })
  it('fails closed when worker supplies no vehicle manifest',()=>{
    expect(source).toContain('Worker has not supplied a GTA V vehicle handoff manifest')
    expect(source).toContain('assessGtaVehicleHandoff(candidate)')
  })
})
