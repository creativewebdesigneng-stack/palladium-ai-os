import { afterEach, describe, expect, it, vi } from 'vitest'
import { CINEMA_MAX_DURATION_MINUTES, getCinemaCapabilities, submitCinemaRender } from './cinema-runtime.server'

const original=process.env['CINEMA_STUDIO_WORKER_URL']
afterEach(()=>{vi.restoreAllMocks(); if(original===undefined) delete process.env['CINEMA_STUDIO_WORKER_URL']; else process.env['CINEMA_STUDIO_WORKER_URL']=original})

describe('Blackstar Cinema Studio',()=>{
 it('supports feature-length targets with hosted mastering without claiming a direct renderer',()=>{
  delete process.env['CINEMA_STUDIO_WORKER_URL']
  const c=getCinemaCapabilities()
  expect(CINEMA_MAX_DURATION_MINUTES).toBeGreaterThanOrEqual(120)
  expect(c.maxDurationMinutes).toBe(180)
  expect(c.configured).toBe(true)
  expect(c.renderConfigured).toBe(false)
  expect(c.masterConfigured).toBe(true)
  expect(c.masterProvider).toBe('blackstar-hosted-master')
  expect(c.continuity).toContain('character')
 })
 it('submits a scene-based long-form render contract to a configured worker',async()=>{
  process.env['CINEMA_STUDIO_WORKER_URL']='https://cinema.example.com/'
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'film-1',status:'queued'}),{status:200}))
  const result=await submitCinemaRender({title:'Test',prompt:'An original science fiction feature film',screenplay:'A'.repeat(200),durationMinutes:125,aspectRatio:'2.39:1',quality:'cinema'})
  expect(result.workerJobId).toBe('film-1')
  expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://cinema.example.com/v1/films')
  const body=JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
  expect(body.duration_minutes).toBe(125)
  expect(body.pipeline.character_continuity).toBe(true)
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({redirect:'manual'})
 })
})
