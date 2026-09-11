import { describe, expect, it } from 'vitest'
import { parseGameFoundryContentManifest } from './game-foundry-content.server'

const valid={
  overview:'A compact two-level combat and exploration slice with progression.',
  scenes:[{id:'hub',name:'Hub',purpose:'Safe staging area',objectives:['Prepare loadout'],encounters:[],environment:['Hangar']}],
  quests:[{id:'q1',title:'First Run',objective:'Reach the objective',prerequisites:[],rewards:['Unlock weapon']}],
  characters:[{id:'npc1',name:'Guide',role:'Mission contact',behavior:['Provides objectives']}],
  spawnGroups:[{id:'s1',type:'enemy',sceneId:'hub',count:3}],
  gameplayEvents:[{id:'e1',trigger:'Quest starts',effect:'Open gate'}],
  assetRequirements:[{id:'a1',name:'Rifle',kind:'weapon',description:'Starter rifle',priority:'high'}],
  validation:['Every spawn references a scene'],
}

describe('Game Foundry content compiler',()=>{
  it('accepts internally consistent content manifests',()=>{
    const parsed=parseGameFoundryContentManifest(JSON.stringify(valid))
    expect(parsed.scenes[0]?.id).toBe('hub')
    expect(parsed.assetRequirements[0]?.kind).toBe('weapon')
  })
  it('rejects invalid scene references',()=>{
    expect(()=>parseGameFoundryContentManifest(JSON.stringify({...valid,spawnGroups:[{id:'s1',type:'enemy',sceneId:'missing',count:3}]}))).toThrow('invalid scene reference')
  })
  it('rejects incomplete manifests',()=>{
    expect(()=>parseGameFoundryContentManifest(JSON.stringify({overview:valid.overview}))).toThrow('incomplete')
  })
})
