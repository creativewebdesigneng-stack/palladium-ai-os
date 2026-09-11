import { describe, expect, it } from 'vitest'
import { buildGameFoundryProjectPackage, gameFoundryPackageFilename } from './game-foundry-project-package.server'

describe('Game Foundry portable project package',()=>{
  const project={
    id:'00000000-0000-0000-0000-000000000001',
    name:'Blackstar Arena',
    prompt:'Create an arena game',
    target_engine:'unreal',
    project_type:'game',
    quality_profile:'game_ready',
    design_spec:{concept:'Arena'},
    source_manifest:{summary:'Starter',files:[{path:'Source/Arena.cpp',purpose:'Gameplay',content:'int main(){}'}],setup:['Open project'],verification:['Build succeeds']},
    export_manifest:{schema:'blackstar.game_foundry.export_manifest.v1',importRoot:'/Game/BlackstarGameFoundry',assets:[{id:'a1',name:'Rifle',format:'fbx',url:'https://example.com/rifle.fbx',preferredSource:'processed',importPath:'/Game/BlackstarGameFoundry/Rifle',validation:{ok:true}}]},
  }
  it('assembles source and linked asset metadata without embedding fake binaries',()=>{
    const pkg=buildGameFoundryProjectPackage({project})
    expect(pkg.schema).toBe('blackstar.game_foundry.project_package.v1')
    expect(pkg.source.files).toHaveLength(1)
    expect(pkg.engineImport.assets).toHaveLength(1)
    expect(pkg.assembly.includesBinaryAssets).toBe(false)
  })
  it('requires real generated source',()=>{
    expect(()=>buildGameFoundryProjectPackage({project:{...project,source_manifest:{}}})).toThrow('Generate the Game Foundry engine source')
  })
  it('creates a deterministic safe package filename',()=>{
    expect(gameFoundryPackageFilename('Blackstar Arena','Unreal')).toBe('blackstar-arena-unreal-blackstar-game-project.json')
  })
})
