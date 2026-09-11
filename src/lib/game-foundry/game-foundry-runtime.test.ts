import { afterEach, describe, expect, it } from 'vitest'
import {
  getGameFoundryCapabilities,
  submitGameFoundryAsset,
  submitGameFoundryProject,
} from './game-foundry-runtime.server'

const originalAsset = process.env.GAME_FOUNDRY_3D_API_URL
const originalGame = process.env.GAME_FOUNDRY_GAME_API_URL

afterEach(() => {
  if (originalAsset === undefined) delete process.env.GAME_FOUNDRY_3D_API_URL
  else process.env.GAME_FOUNDRY_3D_API_URL = originalAsset
  if (originalGame === undefined) delete process.env.GAME_FOUNDRY_GAME_API_URL
  else process.env.GAME_FOUNDRY_GAME_API_URL = originalGame
})

describe('Blackstar Game Foundry runtime', () => {
  it('reports engine/export capabilities without pretending plugins are configured', () => {
    delete process.env.GAME_FOUNDRY_3D_API_URL
    delete process.env.GAME_FOUNDRY_GAME_API_URL
    const caps = getGameFoundryCapabilities()
    expect(caps.gameGeneration.configured).toBe(false)
    expect(caps.engines.find((engine) => engine.id === 'unreal')?.integration).toBe('export-or-plugin')
    expect(caps.engines.find((engine) => engine.id === 'unity')?.exports).toContain('fbx')
  })

  it('fails closed for prompt-to-3D when no real Game Foundry worker exists', async () => {
    delete process.env.GAME_FOUNDRY_3D_API_URL
    await expect(submitGameFoundryAsset({
      sourceKind: 'prompt',
      prompt: 'game-ready sci-fi crate',
      sourceUrl: null,
      outputFormat: 'glb',
      qualityProfile: 'game_ready',
      targetEngine: 'unreal',
    })).rejects.toThrow('GAME_FOUNDRY_3D_API_URL')
  })

  it('fails closed for full game generation when no build worker exists', async () => {
    delete process.env.GAME_FOUNDRY_GAME_API_URL
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
