import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const runtime=readFileSync('src/lib/three-d/three-d-runtime.server.ts','utf8')
const functions=readFileSync('src/lib/three-d/three-d-studio.functions.ts','utf8')
const screen=readFileSync('src/screens/ThreeDStudio.jsx','utf8')

describe('3D Studio operational certification',()=>{
  it('uses a live worker health probe rather than configuration alone',()=>{
    expect(runtime).toContain('probeThreeDWorker')
    expect(runtime).toContain('${base}/health')
    expect(runtime).toContain('readySignal')
    expect(functions).toContain('certifyThreeDStudio')
    expect(screen).toContain('Certify live worker')
    expect(screen).toContain('3D execution route configured')
    expect(screen).not.toContain('Modly-compatible worker configured')
  })
  it('requires persisted real output evidence for execution certification',()=>{
    expect(functions).toContain('executionCertified')
    expect(functions).toContain('Complete at least one real 3D Studio job with a persisted output URL.')
    expect(functions).toContain('3D worker reported completed without an output URL.')
    expect(functions).toContain('.eq("user_id", context.userId)')
    expect(screen).toContain('Worker ready · output evidence needed')
  })
})
