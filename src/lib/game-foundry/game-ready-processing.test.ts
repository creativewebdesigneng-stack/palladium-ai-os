import { afterEach, describe, expect, it } from 'vitest'
import { getGameReadyProcessingCapabilities, submitGameReadyProcessing } from './game-foundry-runtime.server'

const original = process.env['GAME_FOUNDRY_3D_API_URL']
afterEach(() => {
  if (original === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL'] = original
})

describe('Game Foundry game-ready processing', () => {
  it('reports real processing as unavailable without a worker', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    const caps = getGameReadyProcessingCapabilities()
    expect(caps.configured).toBe(false)
    expect(caps.operations).toContain('pbr_materials')
    expect(caps.operations).toContain('lod_generation')
  })
  it('fails closed rather than simulating processing', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    await expect(submitGameReadyProcessing({
      sourceUrl:'https://example.com/model.glb',
      targetEngine:'unreal',
      outputFormat:'glb',
      profile:{
        generatePbrMaterials:true,unwrapUvs:true,generateLods:true,generateCollision:true,optimizeTopology:true,
        rigging:'none',animation:'none',textureResolution:2048,targetPolycount:null,
      },
    })).rejects.toThrow('GAME_FOUNDRY_3D_API_URL')
  })
})
