import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/screens/GameFoundry.jsx'), 'utf8')

describe('Game Foundry GTA V vehicle mode', () => {
  it('uses existing authenticated asset submission rather than a fake local job', () => {
    expect(source).toContain('createAssetFn({data:{')
    expect(source).toContain('prepareGtaVehicleGeneration')
    expect(source).toContain("targetEngine:gtaVehicleMode?'zmodeler':assetEngine")
    expect(source).toContain("outputFormat:gtaVehicleMode?'obj':format")
  })
  it('labels GTA V conversion as unfinished', () => {
    expect(source).toContain('GTA V vehicle preparation (experimental)')
    expect(source).toContain('not an installable GTA V mod')
    expect(source).toContain('Native .yft/.ytd conversion')
  })
})
