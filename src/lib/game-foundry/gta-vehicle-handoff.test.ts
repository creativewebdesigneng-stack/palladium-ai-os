import { describe, expect, it } from 'vitest'
import { assessGtaVehicleHandoff } from './gta-vehicle-handoff'

const valid = {
  projectId: '11111111-1111-4111-8111-111111111111',
  sourceFormat: 'fbx',
  sourceUrl: 'https://assets.example.com/car.fbx',
  category: 'car',
  modelName: 'blackstar_car',
  meshParts: ['chassis', 'wheel_lf', 'wheel_rf'],
  materials: ['vehicle_paint'],
  textureUrls: ['https://assets.example.com/paint.png'],
  lodCount: 2,
  collisionMesh: true,
  rigged: true,
}

describe('GTA V vehicle handoff readiness', () => {
  it('accepts a complete interchange manifest without claiming native export', () => {
    const result = assessGtaVehicleHandoff(valid)
    expect(result.ready).toBe(true)
    expect(result.exportStatus).toBe('interchange_only')
    expect(result.nativeGtaFilesGenerated).toBe(false)
  })
  it('blocks driveable models with no rigging or collision', () => {
    const result = assessGtaVehicleHandoff({ ...valid, collisionMesh: false, rigged: false })
    expect(result.ready).toBe(false)
    expect(result.errors).toHaveLength(2)
  })
  it('rejects non-HTTPS sources and unsafe model names', () => {
    expect(assessGtaVehicleHandoff({ ...valid, sourceUrl: 'http://example.com/a.fbx' }).ready).toBe(false)
    expect(assessGtaVehicleHandoff({ ...valid, modelName: '../unsafe' }).ready).toBe(false)
  })
})
