import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BLACKSTAR_HOSTED_3D_WORKER,
  getGameReadyProcessingCapabilities,
  preferredGameFoundryAssetFormat,
  submitGameReadyProcessing,
} from './game-foundry-runtime.server'

const original = process.env['GAME_FOUNDRY_3D_API_URL']
afterEach(() => {
  vi.restoreAllMocks()
  if (original === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL'] = original
})

describe('Game Foundry game-ready processing', () => {
  it('uses real Blackstar-hosted processing without a private worker', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    const caps = getGameReadyProcessingCapabilities()
    expect(caps.configured).toBe(true)
    expect(caps.provider).toBe('blackstar-hosted-3d')
    expect(caps.operations).toContain('pbr_materials')
    expect(caps.operations).toContain('lod_generation')
    expect(caps.operations).not.toContain('auto_rigging')
  })

  it('submits bounded hosted GLB processing instead of simulating it', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({
      id:'process-1',
      status:'completed',
      output_url:'https://media.example/game-ready.glb',
      validation_report:{valid:true,output:{format:'glb'}},
    }),{status:200}))
    const result=await submitGameReadyProcessing({
      sourceUrl:'https://example.com/model.glb',
      targetEngine:'unreal',
      outputFormat:'fbx',
      profile:{
        generatePbrMaterials:true,unwrapUvs:true,generateLods:true,generateCollision:true,optimizeTopology:true,
        rigging:'none',animation:'none',textureResolution:2048,targetPolycount:null,
      },
    })
    expect(result.status).toBe('completed')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${BLACKSTAR_HOSTED_3D_WORKER}/v1/assets/process`)
    const body=JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.output_format).toBe('glb')
    expect(result.validationReport).toMatchObject({valid:true,output:{format:'glb'}})
  })

  it('fails closed for unsupported hosted rigging rather than fabricating it', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    await expect(submitGameReadyProcessing({
      sourceUrl:'https://example.com/model.glb',
      targetEngine:'unreal',
      outputFormat:'glb',
      profile:{
        generatePbrMaterials:true,unwrapUvs:true,generateLods:true,generateCollision:true,optimizeTopology:true,
        rigging:'auto',animation:'none',textureResolution:2048,targetPolycount:null,
      },
    })).rejects.toThrow('does not fabricate rigging or animation')
  })

  it('chooses a hosted-worker-compatible format for Unity and Unreal',()=>{
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    expect(preferredGameFoundryAssetFormat('unity')).toBe('glb')
    expect(preferredGameFoundryAssetFormat('unreal')).toBe('glb')
    process.env['GAME_FOUNDRY_3D_API_URL']='https://private-worker.example.com'
    expect(preferredGameFoundryAssetFormat('unity')).toBe('fbx')
    expect(preferredGameFoundryAssetFormat('unreal')).toBe('fbx')
  })
})
