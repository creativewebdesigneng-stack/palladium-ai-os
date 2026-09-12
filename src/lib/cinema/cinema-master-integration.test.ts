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
  it('uses the hosted Blackstar master worker while retaining an override',()=>{
    expect(runtime).toContain('BLACKSTAR_CINEMA_MASTER_WORKER_URL')
    expect(runtime).toContain("CINEMA_STUDIO_MASTER_WORKER_URL")
    expect(runtime).toContain('/v1/films/assemble')
  })
  it('keeps direct text-to-film distinct from evidence-based final assembly',()=>{
    expect(runtime).toContain('renderConfigured')
    expect(runtime).toContain('masterConfigured')
    expect(panel).toContain('Audit master')
    expect(panel).toContain('Assemble feature film')
    expect(panel).toContain('Blackstar Cinema mastering is online')
  })
})
