import { afterEach, describe, expect, it } from 'vitest'
import { buildGameFoundryExportManifest, gameFoundryBridgeBase, submitGameFoundryBridgeHandoff } from './game-foundry-package.server'

const original = process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
afterEach(() => {
  if (original === undefined) delete process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
  else process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL'] = original
})

const project = {
  id:'00000000-0000-0000-0000-000000000001',
  name:'Arena', prompt:'Build an arena', target_engine:'unreal', project_type:'game', quality_profile:'game_ready', design_spec:{concept:'Arena'},
} as const

describe('Game Foundry engine handoff', () => {
  it('builds deterministic engine-aware manifests from linked completed assets', () => {
    const manifest = buildGameFoundryExportManifest(project, [{
      id:'asset-1', input_name:'Hero Rifle', requested_format:'fbx', output_url:'https://example.com/rifle.fbx', processed_output_url:'https://example.com/rifle-ready.fbx', target_engine:'unreal', validation_report:{ok:true},
    }])
    expect(manifest.schema).toBe('blackstar.game_foundry.export_manifest.v1')
    expect(manifest.importRoot).toBe('/Game/BlackstarGameFoundry')
    expect(manifest.assets[0]?.preferredSource).toBe('processed')
    expect(manifest.assets[0]?.importPath).toContain('Hero-Rifle')
  })

  it('fails when a project has no usable completed asset outputs', () => {
    expect(() => buildGameFoundryExportManifest(project, [])).toThrow('no completed 3D assets')
  })

  it('does not claim a bridge without explicit configuration', async () => {
    delete process.env['GAME_FOUNDRY_UNREAL_BRIDGE_URL']
    expect(gameFoundryBridgeBase('unreal')).toBe('')
    await expect(submitGameFoundryBridgeHandoff({engine:'unreal',manifest:{},projectId:project.id})).rejects.toThrow('No unreal Game Foundry bridge is configured')
  })
})
