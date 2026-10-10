import { describe, expect, it } from 'vitest'
import { assessGtaVehicleInspection } from './gta-vehicle-inspection'
const assetId='11111111-1111-4111-8111-111111111111'
const outputUrl='https://example.com/vehicle.obj'
const expected={assetId,outputUrl,category:'car' as const}
const valid={assetId,inspectedOutputUrl:outputUrl,inspector:{provider:'trusted-worker',jobId:'inspection-1',completedAt:'2026-10-10T12:00:00.000Z'},observed:{meshNames:['chassis','wheel_lf'],materialCount:1,textureCount:1,lodCount:2,collisionMeshDetected:true,wheelRigDetected:true},nativeFilesGenerated:false}
describe('GTA vehicle inspection evidence',()=>{
  it('accepts independently observed interchange evidence without claiming native files',()=>{
    const result=assessGtaVehicleInspection(valid,expected)
    expect(result.verified).toBe(true)
    expect(result.nativeGtaFilesGenerated).toBe(false)
  })
  it('rejects evidence for another asset',()=>expect(assessGtaVehicleInspection({...valid,assetId:'22222222-2222-4222-8222-222222222222'},expected).verified).toBe(false))
  it('rejects missing collision and rigging',()=>expect(assessGtaVehicleInspection({...valid,observed:{...valid.observed,collisionMeshDetected:false,wheelRigDetected:false}},expected).verified).toBe(false))
  it('rejects a claim of generated native files',()=>expect(assessGtaVehicleInspection({...valid,nativeFilesGenerated:true},expected).verified).toBe(false))
})
