import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGameFoundryAssetJob } from './game-foundry-runtime.server'

const original=process.env['GAME_FOUNDRY_3D_API_URL']
afterEach(()=>{
  vi.restoreAllMocks()
  if(original===undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL']=original
})

describe('Game Foundry exact worker refresh',()=>{
  it('polls the custom 3D worker by exact job id and normalises status',async()=>{
    process.env['GAME_FOUNDRY_3D_API_URL']='https://worker.example.com'
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({status:'succeeded',output_url:'https://cdn.example.com/model.glb'}),{status:200,headers:{'content-type':'application/json'}}))
    const result=await getGameFoundryAssetJob('job-123','game-foundry-3d')
    expect(result.status).toBe('completed')
    expect(result.provider).toBe('game-foundry-3d')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/assets/jobs/job-123')
  })
  it('rejects malformed worker ids before any network call',async()=>{
    process.env['GAME_FOUNDRY_3D_API_URL']='https://worker.example.com'
    const fetchMock=vi.spyOn(globalThis,'fetch')
    await expect(getGameFoundryAssetJob('../secret','game-foundry-3d')).rejects.toThrow('Invalid Game Foundry asset worker id')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
