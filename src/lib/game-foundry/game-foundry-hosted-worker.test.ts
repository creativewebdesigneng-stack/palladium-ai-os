import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGameFoundryCapabilities, submitGameFoundryAsset, getGameFoundryAssetJob } from './game-foundry-runtime.server'

const originalWorker = process.env['GAME_FOUNDRY_3D_API_URL']
const originalFal = process.env['FAL_API_KEY']
afterEach(() => {
  vi.restoreAllMocks()
  if (originalWorker === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL'] = originalWorker
  if (originalFal === undefined) delete process.env['FAL_API_KEY']
  else process.env['FAL_API_KEY'] = originalFal
})

describe('Blackstar FAL 3D generation fallback', () => {
  it('does not advertise generation without credentials or a real reachable custom worker', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    delete process.env['FAL_API_KEY']
    delete process.env['FAL_KEY']
    const caps = getGameFoundryCapabilities()
    expect(caps.assetGeneration.promptTo3d).toBe(false)
    expect(caps.assetGeneration.configuredProvider).toBe('unavailable')
  })

  it('advertises only actual FAL generation export formats', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    process.env['FAL_API_KEY'] = 'test-only-key'
    const caps = getGameFoundryCapabilities()
    expect(caps.assetGeneration.promptTo3d).toBe(true)
    expect(caps.assetGeneration.configuredProvider).toBe('fal-3d')
    expect(caps.assetGeneration.formats).toContain('obj')
    expect(caps.assetGeneration.formats).not.toContain('vox')
  })

  it('submits a prompt to the real FAL model queue contract, not a CloudFront frontend hostname', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    process.env['FAL_API_KEY'] = 'test-only-key'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ request_id: '123e4567-e89b-12d3-a456-426614174000' }), { status: 200 },
    ))
    const result = await submitGameFoundryAsset({
      sourceKind: 'prompt', prompt: 'A racing car for a game', sourceUrl: null,
      outputFormat: 'obj', qualityProfile: 'game_ready', targetEngine: 'zmodeler',
    })
    expect(result.status).toBe('queued')
    expect(result.provider).toBe('fal-3d-text')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://queue.fal.run/fal-ai/hunyuan3d-v3/text-to-3d')
    const input = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(input.prompt).toContain('racing car')
    expect(input.generate_type).toBe('LowPoly')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Key test-only-key' })
  })

  it('polls a completed FAL job and selects its real OBJ output rather than fabricating an export', async () => {
    process.env['FAL_API_KEY'] = 'test-only-key'
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'COMPLETED' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        model_glb: { url: 'https://v3b.fal.media/generated.glb' },
        model_urls: { obj: { url: 'https://v3b.fal.media/generated.obj' } },
        thumbnail: { url: 'https://v3b.fal.media/preview.png' },
      }), { status: 200 }))
    const job = await getGameFoundryAssetJob('123e4567-e89b-12d3-a456-426614174000', 'fal-3d-text', 'obj')
    expect(job.status).toBe('completed')
    expect(job.outputUrl).toBe('https://v3b.fal.media/generated.obj')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('routes an image source into the FAL image-to-3D queue', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    process.env['FAL_API_KEY'] = 'test-only-key'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ request_id: '123e4567-e89b-12d3-a456-426614174001' }), { status: 200 },
    ))
    const result = await submitGameFoundryAsset({
      sourceKind: 'image', prompt: null, sourceUrl: 'https://public.example.com/photo.png',
      outputFormat: 'glb', qualityProfile: 'draft', targetEngine: 'unreal',
    })
    expect(result.provider).toBe('fal-3d-image')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/fal-ai/hunyuan3d-v3/image-to-3d')
  })
})
