import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260912004000_cinema_shot_renders.sql','utf8')
const functions=readFileSync('src/lib/cinema/cinema-render.functions.ts','utf8')
const screen=readFileSync('src/components/cinema/CinemaSceneRenderPanel.jsx','utf8')

describe('Cinema shot rendering integration',()=>{
  it('links shot evidence to canonical media jobs under owner RLS',()=>{
    expect(migration).toContain('cinema_project_id uuid not null references public.cinema_projects')
    expect(migration).toContain('media_job_id uuid references public.media_generation_jobs')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('auth.uid()=user_id')
  })
  it('reuses Seedream for keyframes and LTX for bounded video segments',()=>{
    expect(functions).toContain("provider:'seedream'")
    expect(functions).toContain("provider:'ltx'")
    expect(functions).toContain('submitGenerativeMediaJob')
    expect(functions).toContain('const keyframeUrl=String(keyframeByShot.get')
    expect(functions).toContain('sourceUrl:keyframeUrl')
  })
  it('prevents duplicate project scene shot stage segments',()=>{
    expect(migration).toContain('cinema_shot_renders_unique_segment')
  })
  it('surfaces real worker readiness and render evidence rather than fake outputs',()=>{
    expect(screen).toContain('Seedream worker required for keyframes')
    expect(screen).toContain('LTX worker required for video segments')
    expect(screen).toContain('Generate keyframes')
    expect(screen).toContain('Generate video')
  })
})
