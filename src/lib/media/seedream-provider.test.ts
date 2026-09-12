import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDirectSeedream, submitDirectSeedream } from './seedream-provider.server'

const original=process.env['FAL_KEY']
afterEach(()=>{vi.restoreAllMocks();if(original===undefined) delete process.env['FAL_KEY']; else process.env['FAL_KEY']=original})

describe('direct Seedream provider',()=>{
  it('submits a server-side Seedream keyframe job',async()=>{
    process.env['FAL_KEY']='test-key'
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({request_id:'seed-1'}),{status:200}))
    const result=await submitDirectSeedream({prompt:'cinematic deep-space observation deck',aspectRatio:'16:9'})
    expect(result.workerJobId).toBe('seed-1')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({Authorization:'Key test-key'})
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('test-key')
  })
  it('returns a real image URL only after provider completion',async()=>{
    process.env['FAL_KEY']='test-key'
    const fetchMock=vi.spyOn(globalThis,'fetch')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({status:'COMPLETED'}),{status:200}))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({images:[{url:'https://cdn.example.com/keyframe.png'}]}),{status:200}))
    const result=await getDirectSeedream('seed-1')
    expect(result.status).toBe('completed')
    expect(result.outputUrl).toBe('https://cdn.example.com/keyframe.png')
  })
})
