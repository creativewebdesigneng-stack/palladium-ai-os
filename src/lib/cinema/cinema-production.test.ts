import { describe, expect, it } from 'vitest'
import { parseCinemaProductionManifest, parseCinemaShotPlan } from './cinema-production.server'

const production={
  title:'Signal Black',
  logline:'A deep-space investigator discovers a transmission that changes the meaning of her mission.',
  theme:'Identity under uncertainty',
  visualBible:{camera:'restrained',lensLanguage:'wide interiors',lighting:'motivated practicals',colour:'cold neutrals',motion:'slow deliberate moves',texture:'fine cinematic grain'},
  soundBible:{dialogue:'intimate',ambience:'ship resonance',music:'sparse tonal score',effects:'physical and restrained'},
  characters:[{id:'mara',name:'Mara',role:'investigator',appearance:'short dark hair and flight suit',wardrobe:['charcoal flight suit'],voice:'low measured voice',continuity:['scar above left brow']}],
  locations:[{id:'bridge',name:'Bridge',description:'compact deep-space bridge',lighting:'cool instrument glow',palette:['charcoal','cyan'],continuity:['left console cracked']}],
  scenes:[{id:'s1',act:1,title:'The Signal',estimatedDurationSeconds:120,locationId:'bridge',characterIds:['mara'],purpose:'introduce the anomaly',beats:['routine scan','signal arrives'],visualIntent:'quiet dread',audioIntent:'low machinery and signal tone'}],
  validation:['scene references are valid']
}

describe('Cinema production compiler',()=>{
  it('accepts internally consistent scene graphs close to the requested runtime',()=>{
    const parsed=parseCinemaProductionManifest(JSON.stringify(production),2)
    expect(parsed.scenes[0]?.locationId).toBe('bridge')
    expect(parsed.characters[0]?.id).toBe('mara')
  })
  it('normalizes optional AI manifest omissions before strict validation',()=>{
    const incomplete={
      ...production,
      visualBible:{camera:'restrained'},
      soundBible:{dialogue:'intimate'},
      characters:[{id:'mara',name:'Mara',appearance:'short dark hair and flight suit'}],
      locations:[{id:'bridge',name:'Bridge'}],
      scenes:[{...production.scenes[0],beats:undefined,visualIntent:undefined,audioIntent:undefined}],
      validation:undefined,
    }
    const parsed=parseCinemaProductionManifest(JSON.stringify(incomplete),2)
    expect(parsed.characters[0]?.wardrobe).toEqual([])
    expect(parsed.locations[0]?.lighting).toBeTruthy()
    expect(parsed.scenes[0]?.beats.length).toBeGreaterThan(0)
    expect(parsed.visualBible.lighting).toBeTruthy()
    expect(parsed.validation.length).toBeGreaterThan(0)
  })
  it('rejects invalid continuity references',()=>{
    expect(()=>parseCinemaProductionManifest(JSON.stringify({...production,scenes:[{...production.scenes[0],characterIds:['missing']}]}),2)).toThrow('invalid scene character reference')
  })
  it('rejects scene runtimes far away from the target',()=>{
    expect(()=>parseCinemaProductionManifest(JSON.stringify(production),20)).toThrow('scene durations too far')
  })
})

describe('Cinema shot compiler',()=>{
  const plan={sceneId:'s1',shots:[
    {id:'s1-sh1',durationSeconds:30,framing:'wide',camera:'slow dolly',action:'Mara studies the console',dialogue:'',visualPrompt:'cinematic spacecraft bridge with Mara at console',negativePrompt:'text, logos',audioPrompt:'low machinery',characterIds:['mara'],continuityNotes:['charcoal flight suit']},
    {id:'s1-sh2',durationSeconds:30,framing:'close',camera:'locked close-up',action:'signal waveform appears',dialogue:'What are you?',visualPrompt:'close portrait of Mara lit by cyan instrument glow',negativePrompt:'text, logos',audioPrompt:'signal tone',characterIds:['mara'],continuityNotes:['scar above left brow']},
    {id:'s1-sh3',durationSeconds:30,framing:'insert',camera:'macro push',action:'waveform resolves',dialogue:'',visualPrompt:'instrument waveform cinematic insert',negativePrompt:'watermark',audioPrompt:'rising electronic tone',characterIds:[],continuityNotes:['left console cracked']},
    {id:'s1-sh4',durationSeconds:30,framing:'medium',camera:'slow orbit',action:'Mara reacts',dialogue:'',visualPrompt:'Mara reacting on deep-space bridge',negativePrompt:'text',audioPrompt:'room tone',characterIds:['mara'],continuityNotes:['charcoal flight suit']}
  ],validation:['duration matches scene']}
  it('accepts a bounded shot plan with valid scene characters',()=>{
    expect(parseCinemaShotPlan(JSON.stringify(plan),'s1',120,['mara']).shots).toHaveLength(4)
  })
  it('rejects invalid shot character references',()=>{
    const bad={...plan,shots:[{...plan.shots[0],characterIds:['other']},...plan.shots.slice(1)]}
    expect(()=>parseCinemaShotPlan(JSON.stringify(bad),'s1',120,['mara'])).toThrow('invalid character reference')
  })
})
