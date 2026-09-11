import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getGameFoundryCapabilities,
  submitGameFoundryAsset,
  submitGameFoundryProject,
} from './game-foundry-runtime.server'

const originalAsset = process.env['GAME_FOUNDRY_3D_API_URL']
const originalGame = process.env['GAME_FOUNDRY_GAME_API_URL']

afterEach(() => {
  vi.restoreAllMocks()
  if (originalAsset === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
  else process.env['GAME_FOUNDRY_3D_API_URL'] = originalAsset
  if (originalGame === undefined) delete process.env['GAME_FOUNDRY_GAME_API_URL']
  else process.env['GAME_FOUNDRY_GAME_API_URL'] = originalGame
})

describe('Blackstar Game Foundry runtime', () => {
  it('reports engine/export capabilities without pretending plugins are configured', () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    delete process.env['GAME_FOUNDRY_GAME_API_URL']
    const caps = getGameFoundryCapabilities()
    expect(caps.gameGeneration.configured).toBe(false)
    expect(caps.engines.find((engine) => engine.id === 'unreal')?.integration).toBe('export-or-plugin')
    expect(caps.engines.find((engine) => engine.id === 'unity')?.exports).toContain('fbx')
  })

  it('uses the official Blackstar hosted worker for prompt-to-3D when no override exists', async () => {
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'job-1',
      status: 'completed',
      output_url: 'https://cdn.example.com/crate.glb',
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const result = await submitGameFoundryAsset({
      sourceKind: 'prompt',
      prompt: 'game-ready sci-fi crate',
      sourceUrl: null,
      outputFormat: 'glb',
      qualityProfile: 'game_ready',
      targetEngine: 'unreal',
    })
    expect(result.workerJobId).toBe('job-1')
    expect(result.provider).toBe('game-foundry-3d')
  })

  it('fails closed for full game generation when no build worker exists', async () => {
    delete process.env['GAME_FOUNDRY_GAME_API_URL']
    await expect(submitGameFoundryProject({
      projectId: '00000000-0000-0000-0000-000000000001',
      name: 'Test game',
      prompt: 'Create a test game',
      projectType: 'game',
      targetEngine: 'unity',
      qualityProfile: 'prototype',
    })).rejects.toThrow('GAME_FOUNDRY_GAME_API_URL')
  })
})
