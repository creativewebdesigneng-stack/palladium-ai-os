import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDirectLtx23, ltx23ProviderDuration, submitDirectLtx23 } from './ltx23-provider.server'

const original=process.env['FAL_KEY']
afterEach(()=>{vi.restoreAllMocks();if(original===undefined) delete process.env['FAL_KEY']; else process.env['FAL_KEY']=original})

describe('LTX 2.3 provider adapter',()=>{
  it('maps Blackstar logical durations to supported provider durations',()=>{
    expect(ltx23ProviderDuration(3)).toBe(6)
    expect(ltx23ProviderDuration(5)).toBe(6)
    expect(ltx23ProviderDuration(8)).toBe(8)
    expect(ltx23ProviderDuration(10)).toBe(10)
  })
  it('submits image-to-video without exposing the provider key',async()=>{
    process.env['FAL_KEY']='test-key'
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({request_id:'req-1'}),{status:200}))
    const result=await submitDirectLtx23({prompt:'cinematic camera push toward the subject',sourceUrl:'https://cdn.example.com/frame.png',aspectRatio:'16:9',durationSeconds:5})
    expect(result.workerJobId).toBe('req-1')
    expect(result.metadata.providerDurationSeconds).toBe(6)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({Authorization:'Key test-key'})
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('test-key')
  })
  it('returns the real video URL only after provider completion',async()=>{
    process.env['FAL_KEY']='test-key'
    const fetchMock=vi.spyOn(globalThis,'fetch')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({status:'COMPLETED'}),{status:200}))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({video:{url:'https://cdn.example.com/segment.mp4'}}),{status:200}))
    const result=await getDirectLtx23('req-1')
    expect(result.status).toBe('completed')
    expect(result.outputUrl).toBe('https://cdn.example.com/segment.mp4')
  })
})
