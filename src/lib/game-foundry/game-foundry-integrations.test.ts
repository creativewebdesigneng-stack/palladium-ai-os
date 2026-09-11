import { afterEach, describe, expect, it } from 'vitest'
import { getGameFoundryIntegrations } from './game-foundry-integrations.server'

const original = process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
afterEach(() => {
  if (original === undefined) delete process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
  else process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL'] = original
})

describe('Game Foundry integration registry', () => {
  it('reports export-only when no bridge exists', () => {
    delete process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
    const unreal = getGameFoundryIntegrations().find((item) => item.id === 'unreal')
    expect(unreal?.status).toBe('export_only')
    expect(unreal?.formats).toContain('fbx')
  })
  it('reports a bridge only when its endpoint is configured', () => {
    process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL'] = 'https://bridge.example.com'
    const unreal = getGameFoundryIntegrations().find((item) => item.id === 'unreal')
    expect(unreal?.status).toBe('configured_bridge')
    expect(unreal?.bridgeConfigured).toBe(true)
  })
  it('includes requested DCC targets without claiming remote access', () => {
    const integrations = getGameFoundryIntegrations()
    expect(integrations.some((item) => item.id === 'blender')).toBe(true)
    expect(integrations.some((item) => item.id === 'zmodeler3')).toBe(true)
    expect(integrations.some((item) => item.id === 'houdini')).toBe(true)
  })
})
