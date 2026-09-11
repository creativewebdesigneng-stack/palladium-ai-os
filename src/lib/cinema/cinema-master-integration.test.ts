import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions=readFileSync('src/lib/cinema/cinema-master.functions.ts','utf8')
const runtime=readFileSync('src/lib/cinema/cinema-runtime.server.ts','utf8')
const panel=readFileSync('src/components/cinema/CinemaMasterPanel.jsx','utf8')

describe('Cinema master integration',()=>{
  it('requires readiness before submitting the master',()=>{
    expect(functions).toContain("if(!manifest.ready) throw new Error")
    expect(functions).toContain('submitCinemaMasterAssembly')
  })
  it('keeps final mastering behind the external Cinema worker boundary',()=>{
    expect(runtime).toContain('Cinema master assembly requires CINEMA_STUDIO_WORKER_URL.')
    expect(runtime).toContain('/v1/films/assemble')
  })
  it('surfaces readiness without pretending the worker is online',()=>{
    expect(panel).toContain('Audit master')
    expect(panel).toContain('Assemble feature film')
    expect(panel).toContain('CINEMA_STUDIO_WORKER_URL is required only for final assembly')
  })
})
