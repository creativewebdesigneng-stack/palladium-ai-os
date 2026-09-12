import { afterEach, describe, expect, it, vi } from 'vitest'
import { CINEMA_MAX_DURATION_MINUTES, getCinemaCapabilities, submitCinemaRender } from './cinema-runtime.server'

const originalWorker=process.env['CINEMA_STUDIO_WORKER_URL']
const originalMasterWorker=process.env['CINEMA_STUDIO_MASTER_WORKER_URL']
afterEach(()=>{
 vi.restoreAllMocks()
 if(originalWorker===undefined) delete process.env['CINEMA_STUDIO_WORKER_URL']; else process.env['CINEMA_STUDIO_WORKER_URL']=originalWorker
 if(originalMasterWorker===undefined) delete process.env['CINEMA_STUDIO_MASTER_WORKER_URL']; else process.env['CINEMA_STUDIO_MASTER_WORKER_URL']=originalMasterWorker
})

describe('Blackstar Cinema Studio',()=>{
 it('supports feature-length targets with hosted mastering without claiming a direct renderer',()=>{
  delete process.env['CINEMA_STUDIO_WORKER_URL']
  delete process.env['CINEMA_STUDIO_MASTER_WORKER_URL']
  const c=getCinemaCapabilities()
  expect(CINEMA_MAX_DURATION_MINUTES).toBeGreaterThanOrEqual(120)
  expect(c.maxDurationMinutes).toBe(180)
  expect(c.configured).toBe(true)
  expect(c.renderConfigured).toBe(false)
  expect(c.masterConfigured).toBe(true)
  expect(c.masterProvider).toBe('blackstar-hosted-master')
  expect(c.note).toContain('Direct one-shot text-to-film rendering remains disabled')
  expect(c.continuity).toContain('character')
 })
 it('reports a dedicated mastering override without claiming direct text-to-film rendering',()=>{
  delete process.env['CINEMA_STUDIO_WORKER_URL']
  process.env['CINEMA_STUDIO_MASTER_WORKER_URL']='https://master.example.com/'
  const c=getCinemaCapabilities()
  expect(c.renderConfigured).toBe(false)
  expect(c.masterConfigured).toBe(true)
  expect(c.masterProvider).toBe('configured-master-worker')
  expect(c.note).toContain('Direct one-shot text-to-film rendering remains disabled')
 })
 it('keeps the full Cinema worker as the direct renderer when configured',()=>{
  process.env['CINEMA_STUDIO_WORKER_URL']='https://cinema.example.com/'
  delete process.env['CINEMA_STUDIO_MASTER_WORKER_URL']
  const c=getCinemaCapabilities()
  expect(c.renderConfigured).toBe(true)
  expect(c.masterConfigured).toBe(true)
  expect(c.masterProvider).toBe('configured-cinema-worker')
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
