import { describe, expect, it } from 'vitest'
import { buildCinemaAssemblyManifest } from './cinema-master.functions'

const project={
  id:'p1',title:'Signal Black',target_duration_minutes:1,aspect_ratio:'2.39:1',quality:'cinema',
  production_manifest:{
    visualBible:{camera:'restrained'},soundBible:{music:'sparse'},
    scenes:[{id:'s1',title:'Signal',estimatedDurationSeconds:10}],
    shotPlans:{s1:{shots:[{id:'sh1',durationSeconds:10,framing:'wide',camera:'dolly',dialogue:'',audioPrompt:'room tone',continuityNotes:['same suit']}]}}
  }
}

describe('Cinema master assembly manifest',()=>{
  it('orders completed video segments into a deterministic timeline',()=>{
    const manifest=buildCinemaAssemblyManifest(project,[{scene_id:'s1',shot_id:'sh1',stage:'video',segment_index:0,duration_seconds:10,status:'completed',output_url:'https://cdn.example.com/a.mp4'}])
    expect(manifest.ready).toBe(true)
    expect(manifest.timeline[0]?.startSeconds).toBe(0)
    expect(manifest.timeline[0]?.videoUrl).toContain('a.mp4')
  })
  it('blocks assembly when a required segment is missing',()=>{
    const manifest=buildCinemaAssemblyManifest(project,[])
    expect(manifest.ready).toBe(false)
    expect(manifest.blockers.some(item=>item.includes('Complete video segment'))).toBe(true)
  })
  it('never claims the final master already exists',()=>{
    const manifest=buildCinemaAssemblyManifest(project,[{scene_id:'s1',shot_id:'sh1',stage:'video',segment_index:0,duration_seconds:10,status:'completed',output_url:'https://cdn.example.com/a.mp4'}])
    expect(manifest.note).toContain('does not claim the final feature-film master exists')
  })
})
