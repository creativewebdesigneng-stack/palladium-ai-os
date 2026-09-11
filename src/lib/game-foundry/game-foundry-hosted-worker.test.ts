import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGameFoundryCapabilities, submitGameFoundryAsset } from './game-foundry-runtime.server'

const original = process.env['GAME_FOUNDRY_3D_API_URL']

afterEach(() => {
  vi.restoreAllMocks()
  if (original === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL'] = original
})

describe('Blackstar hosted prompt-to-3D fallback', () => {
  it('advertises prompt-to-3D without requiring a Vercel env var', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    const caps = getGameFoundryCapabilities()
    expect(caps.assetGeneration.promptTo3d).toBe(true)
    expect(caps.assetGeneration.configuredProvider).toBe('blackstar-hosted-3d')
    expect(caps.assetGeneration.formats).not.toContain('fbx')
  })

  it('submits prompt jobs to the official hosted worker when no override is configured', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id:'job-1', status:'completed', output_url:'https://cdn.example.com/model.glb'
    }), { status:200, headers:{'content-type':'application/json'} }))
    const result = await submitGameFoundryAsset({
      sourceKind:'prompt', prompt:'A sci-fi crate', sourceUrl:null, outputFormat:'glb', qualityProfile:'game_ready', targetEngine:'web'
    })
    expect(result.workerJobId).toBe('job-1')
    expect(result.provider).toBe('game-foundry-3d')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://blackstar-3d-worker-v7iyno.v2.appdeploy.ai/v1/assets/generate')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect:'manual' })
  })
})
