import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeGameFoundryConnections } from './game-foundry-integrations.server'

const original3d=process.env['GAME_FOUNDRY_3D_API_URL']
afterEach(()=>{
  vi.restoreAllMocks()
  if(original3d===undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']; else process.env['GAME_FOUNDRY_3D_API_URL']=original3d
})

describe('Game Foundry connector health',()=>{
  it('reports configured and healthy only from a successful health response',async()=>{
    process.env['GAME_FOUNDRY_3D_API_URL']='https://worker.example.com'
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}',{status:200}))
    const health=await probeGameFoundryConnections()
    const worker=health.results.find((item)=>item.id==='3d-worker')
    expect(worker?.configured).toBe(true)
    expect(worker?.reachable).toBe(true)
    expect(worker?.healthy).toBe(true)
  })
  it('distinguishes reachability from health',async()=>{
    process.env['GAME_FOUNDRY_3D_API_URL']='https://worker.example.com'
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('missing',{status:404}))
    const health=await probeGameFoundryConnections()
    const worker=health.results.find((item)=>item.id==='3d-worker')
    expect(worker?.reachable).toBe(true)
    expect(worker?.healthy).toBe(false)
    expect(worker?.httpStatus).toBe(404)
  })
})
