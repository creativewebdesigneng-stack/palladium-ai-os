import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  getGameFoundryCapabilities,
  preferredGameFoundryAssetFormat,
} from './game-foundry-runtime.server'
import {
  buildGameFoundryExportManifest,
  gameFoundryBridgeBase,
} from './game-foundry-package.server'
import { gameFoundryEngineGuidance } from './game-foundry-source.server'

describe('Game Foundry ZModeler3 handoff', () => {
  it('exposes ZModeler as a real target with truthful interchange formats', () => {
    const capabilities = getGameFoundryCapabilities()
    const target = capabilities.engines.find((item) => item.id === 'zmodeler')
    expect(target).toBeDefined()
    expect(target?.exports).toEqual(['fbx','obj'])
    expect(target?.integration).toBe('export-or-bridge')
    expect(capabilities.note).toContain('does not claim native .z3d generation')
  })

  it('prefers OBJ without a specialist worker and FBX when one is configured', () => {
    const previous = process.env['GAME_FOUNDRY_3D_API_URL']
    delete process.env['GAME_FOUNDRY_3D_API_URL']
    expect(preferredGameFoundryAssetFormat('zmodeler')).toBe('obj')
    process.env['GAME_FOUNDRY_3D_API_URL'] = 'https://worker.example.com'
    expect(preferredGameFoundryAssetFormat('zmodeler')).toBe('fbx')
    if (previous === undefined) delete process.env['GAME_FOUNDRY_3D_API_URL']
    else process.env['GAME_FOUNDRY_3D_API_URL'] = previous
  })

  it('builds a ZModeler handoff manifest without fabricating a z3d file', () => {
    const manifest = buildGameFoundryExportManifest({
      id:'11111111-1111-4111-8111-111111111111',
      name:'Vehicle Pack',
      prompt:'Prepare vehicle assets',
      target_engine:'zmodeler',
      project_type:'vehicle',
      quality_profile:'game_ready',
      design_spec:{},
    }, [{
      id:'22222222-2222-4222-8222-222222222222',
      input_name:'sports-car',
      requested_format:'fbx',
      output_url:'https://example.com/sports-car.fbx',
      processed_output_url:null,
      target_engine:'zmodeler',
      validation_report:{ output:{ format:'fbx' } },
    }])
    expect(manifest.importRoot).toBe('./BlackstarGameFoundry-ZModeler3')
    expect(manifest.assets[0]?.format).toBe('fbx')
    expect(JSON.stringify(manifest)).not.toContain('.z3d')
  })

  it('supports an optional configured ZModeler bridge while failing closed when absent', () => {
    const previous = process.env['GAME_FOUNDRY_ZMODELER_BRIDGE_URL']
    delete process.env['GAME_FOUNDRY_ZMODELER_BRIDGE_URL']
    expect(gameFoundryBridgeBase('zmodeler')).toBe('')
    process.env['GAME_FOUNDRY_ZMODELER_BRIDGE_URL'] = 'https://zmodeler-bridge.example.com/'
    expect(gameFoundryBridgeBase('zmodeler')).toBe('https://zmodeler-bridge.example.com')
    if (previous === undefined) delete process.env['GAME_FOUNDRY_ZMODELER_BRIDGE_URL']
    else process.env['GAME_FOUNDRY_ZMODELER_BRIDGE_URL'] = previous
  })

  it('keeps ZModeler source generation as bounded handoff guidance', () => {
    const guidance = gameFoundryEngineGuidance('zmodeler')
    expect(guidance).toContain('FBX/OBJ')
    expect(guidance).toContain('Do not claim a native .z3d scene')
  })

  it('persists ZModeler as an allowed target in the migration contract', () => {
    const sql = readFileSync(
      new URL('../../../supabase/migrations/20261002192319_game_foundry_zmodeler_target.sql', import.meta.url),
      'utf8',
    )
    expect(sql).toContain("'zmodeler'")
    expect(sql).toContain('game_foundry_projects_target_engine_check')
    expect(sql).toContain('three_d_jobs_target_engine_check')
  })
})
