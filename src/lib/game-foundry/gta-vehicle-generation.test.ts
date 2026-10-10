import { describe, expect, it } from 'vitest'
import { prepareGtaVehicleGeneration } from './gta-vehicle-generation'

describe('GTA V prompt/image vehicle generation preparation', () => {
  const base = { prompt: 'Build an original sports coupe with a detailed cabin', modelName: 'bs_sport' }
  it('prepares a ZModeler interchange job without claiming native export', () => {
    const result = prepareGtaVehicleGeneration({ ...base, sourceKind: 'prompt' })
    expect(result.targetEngine).toBe('zmodeler')
    expect(result.nativeGtaExport).toBe(false)
    expect(result.generationPrompt).toContain('wheel pivot')
  })
  it('requires a reference for image jobs', () => {
    expect(() => prepareGtaVehicleGeneration({ ...base, sourceKind: 'image' })).toThrow('reference image')
  })
  it('does not request wheel rigging for static props', () => {
    const result = prepareGtaVehicleGeneration({ ...base, sourceKind: 'prompt', vehicleType: 'prop' })
    expect(result.generationPrompt).not.toContain('wheel pivot')
  })
})
