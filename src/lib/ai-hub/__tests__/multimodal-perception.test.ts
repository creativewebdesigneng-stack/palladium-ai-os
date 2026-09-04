import { describe, expect, it } from 'vitest'
import { buildBlackstarPerceptionPlan } from '../multimodal-perception'

describe('Blackstar Multimodal Perception', () => {
  it('allows governed multimodal inputs', () => {
    const plan = buildBlackstarPerceptionPlan([
      { id: 'img', modality: 'image', source: 'upload://image', sizeBytes: 1024 },
      { id: 'audio', modality: 'audio', source: 'upload://audio', durationSeconds: 30 },
    ])
    expect(plan.executable).toBe(true)
    expect(plan.blockedCount).toBe(0)
  })

  it('blocks disabled modalities', () => {
    const plan = buildBlackstarPerceptionPlan(
      [{ id: 'sensor', modality: 'sensor', source: 'sensor://room' }],
      { allowedModalities: ['text', 'image'] },
    )
    expect(plan.executable).toBe(false)
    expect(plan.blockedCount).toBe(1)
  })

  it('requires approval for allowed restricted inputs by default', () => {
    const plan = buildBlackstarPerceptionPlan(
      [{ id: 'restricted', modality: 'image', source: 'upload://restricted', sensitivity: 'restricted' }],
      { allowRestricted: true },
    )
    expect(plan.executable).toBe(true)
    expect(plan.requiresApproval).toBe(true)
  })

  it('enforces duration and size ceilings', () => {
    const plan = buildBlackstarPerceptionPlan([
      { id: 'long', modality: 'video', source: 'upload://long', durationSeconds: 61 },
      { id: 'large', modality: 'image', source: 'upload://large', sizeBytes: 1001 },
    ], { maximumDurationSeconds: 60, maximumSizeBytes: 1000 })

    expect(plan.blockedCount).toBe(2)
    expect(plan.executable).toBe(false)
  })

  it('bounds the number of perception inputs', () => {
    const plan = buildBlackstarPerceptionPlan(
      Array.from({ length: 4 }, (_, index) => ({ id: `${index}`, modality: 'text' as const, source: `text://${index}` })),
      { maximumInputs: 2 },
    )
    expect(plan.decisions).toHaveLength(2)
  })
})
