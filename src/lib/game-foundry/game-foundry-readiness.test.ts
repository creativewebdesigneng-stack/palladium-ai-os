import { describe, expect, it } from 'vitest'
import { auditGameFoundryReadiness } from './game-foundry-readiness.server'

function project(overrides={}){
  return {
    id:'p1',name:'Arena',target_engine:'web',quality_profile:'prototype',status:'planned',
    design_spec:{concept:'Arena'},content_manifest:{assetRequirements:[]},content_status:'generated',
    source_manifest:{files:[{path:'index.html',content:'<html></html>'}]},source_status:'generated',
    package_manifest:{schema:'blackstar.game_foundry.project_package.v1'},package_status:'prepared',
    export_manifest:{},handoff_status:'not_started',output_url:null,...overrides,
  }
}

describe('Game Foundry readiness audit',()=>{
  it('marks a complete web package runtime-ready without claiming an external engine build',()=>{
    const result=auditGameFoundryReadiness(project(),[])
    expect(result.status).toBe('runtime_ready')
    expect(result.runtimeReady).toBe(true)
    expect(result.checks.externalBuild).toBeNull()
  })
  it('blocks game-ready projects until required assets are processed',()=>{
    const p=project({target_engine:'unreal',quality_profile:'game_ready',content_manifest:{assetRequirements:[{id:'rifle',name:'Rifle',kind:'weapon'}]},status:'planned'})
    const result=auditGameFoundryReadiness(p,[{id:'a1',content_requirement_id:'rifle',status:'completed',output_url:'https://example.com/rifle.fbx',processed_output_url:null,processing_status:'not_started',validation_report:{}}])
    expect(result.packageReady).toBe(false)
    expect(result.blockers.some((item)=>item.includes('game-ready processing'))).toBe(true)
  })
  it('does not call a non-web project runtime-ready without a completed real build',()=>{
    const result=auditGameFoundryReadiness(project({target_engine:'unreal'}),[])
    expect(result.packageReady).toBe(true)
    expect(result.runtimeReady).toBe(false)
    expect(result.blockers.some((item)=>item.includes('real external game build'))).toBe(true)
  })
})
