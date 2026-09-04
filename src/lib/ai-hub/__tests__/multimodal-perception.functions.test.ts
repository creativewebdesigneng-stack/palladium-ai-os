import { describe, expect, it } from 'vitest'
import { validateBlackstarPerceptionRequest } from '../multimodal-perception.functions'

describe('Blackstar multimodal perception server input', () => {
  it('accepts bounded governed inputs', () => {
    const result = validateBlackstarPerceptionRequest({
      inputs: [{ id: 'img-1', modality: 'image', source: 'storage://asset-1', sensitivity: 'internal', sizeBytes: 1024 }],
      policy: { allowedModalities: ['image'], maximumInputs: 5 },
    })
    expect(result.inputs[0]?.modality).toBe('image')
  })

  it('rejects unsupported modalities and unbounded input sets', () => {
    expect(() => validateBlackstarPerceptionRequest({ inputs: [{ id: 'x', modality: 'brainwave', source: 'x' }] })).toThrow()
    expect(() => validateBlackstarPerceptionRequest({ inputs: [] })).toThrow()
  })

  it('rejects oversized payload metadata before policy execution', () => {
    expect(() => validateBlackstarPerceptionRequest({
      inputs: [{ id: 'video-1', modality: 'video', source: 'storage://video', sizeBytes: 2 * 1024 * 1024 * 1024 }],
    })).toThrow()
  })
})
