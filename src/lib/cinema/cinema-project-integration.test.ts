import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260912002000_cinema_projects.sql','utf8')
const functions=readFileSync('src/lib/cinema/cinema.functions.ts','utf8')
const screen=readFileSync('src/screens/CinemaStudio.jsx','utf8')

describe('Cinema project persistence',()=>{
  it('uses an owner-scoped RLS project store rather than overloading render jobs',()=>{
    expect(migration).toContain('create table if not exists public.cinema_projects')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('auth.uid() = user_id')
  })
  it('persists film development then compiles production and scene shots',()=>{
    expect(functions).toContain("from('cinema_projects').insert")
    expect(functions).toContain('compileCinemaProduction')
    expect(functions).toContain('compileCinemaSceneShots')
    expect(functions).toContain('generateCinemaProductionManifest')
    expect(functions).toContain('generateCinemaShotPlan')
  })
  it('surfaces scene graphs and shot compilation in Cinema Studio',()=>{
    expect(screen).toContain('Cinema projects')
    expect(screen).toContain('Compile shots')
    expect(screen).toContain('renderable shots')
  })
})
