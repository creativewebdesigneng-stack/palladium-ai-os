import { describe, expect, it } from 'vitest'
import { deriveAstraActivationSummary } from '../blackstar-astra-activation-status'

function readiness(overrides: Record<string, unknown> = {}) {
  return {
    configured: true,
    evidence_store_available: true,
    routing_infrastructure_ready: true,
    certified_task_classes: 2,
    routable_task_classes: 2,
    certification: [
      {
        task_class: 'general',
        model: 'blackstar-astra-model',
        evidence_available: true,
        certified_eligible: true,
        actually_routable: true,
        evaluation_score: 0.91,
        evaluation_samples: 40,
        evidence_completed_at: '2026-09-06T11:00:00.000Z',
      },
      {
        task_class: 'reasoning',
        model: 'blackstar-astra-model',
        evidence_available: true,
        certified_eligible: true,
        actually_routable: true,
        evaluation_score: 0.93,
        evaluation_samples: 40,
        evidence_completed_at: '2026-09-06T11:00:00.000Z',
      },
    ],
    models: [
      {
        task_classes: ['general', 'reasoning'],
        model: 'blackstar-astra-model',
        serving_ready: true,
        serving_reason: 'ready',
        checked_at: '2026-09-06T12:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

describe('deriveAstraActivationSummary', () => {
  it('marks routing ready only when server-derived certification and routability are complete', () => {
    const result = deriveAstraActivationSummary(readiness())

    expect(result?.state).toBe('routing_ready')
    expect(result?.label).toContain('Certified and routable')
    expect(result?.stages.find((stage) => stage.id === 'certification')?.ready).toBe(true)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(true)
    expect(result?.certification_required).toBe(true)
  })

  it('never treats infrastructure readiness or evidence-store access as certification', () => {
    const result = deriveAstraActivationSummary(readiness({
      certified_task_classes: 0,
      routable_task_classes: 0,
      certification: [
        {
          task_class: 'general',
          model: 'blackstar-astra-model',
          evidence_available: false,
          certified_eligible: false,
          actually_routable: false,
          evaluation_score: null,
          evaluation_samples: 0,
          evidence_completed_at: null,
        },
      ],
    }))

    expect(result?.state).toBe('evidence_missing')
    expect(result?.stages.find((stage) => stage.id === 'certification')?.ready).toBe(false)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(false)
  })

  it('fails closed when the engine is not configured', () => {
    const result = deriveAstraActivationSummary(readiness({
      configured: false,
      routing_infrastructure_ready: false,
      routable_task_classes: 0,
      certification: readiness().certification.map((item) => ({ ...item, actually_routable: false })),
    }))

    expect(result?.state).toBe('not_configured')
    expect(result?.stages.find((stage) => stage.id === 'configured')?.ready).toBe(false)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(false)
  })

  it('keeps serving readiness separate from certification', () => {
    const result = deriveAstraActivationSummary(readiness({
      routing_infrastructure_ready: false,
      routable_task_classes: 0,
      certification: readiness().certification.map((item) => ({ ...item, actually_routable: false })),
      models: [{
        task_classes: ['coding'],
        model: 'blackstar-astra-coder',
        serving_ready: false,
        serving_reason: 'model_unavailable',
        checked_at: '2026-09-06T12:00:00.000Z',
      }],
    }))

    expect(result?.state).toBe('serving_unready')
    expect(result?.stages.find((stage) => stage.id === 'configured')?.ready).toBe(true)
    expect(result?.stages.find((stage) => stage.id === 'serving')?.ready).toBe(false)
    expect(result?.stages.find((stage) => stage.id === 'certification')?.ready).toBe(true)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(false)
  })

  it('keeps evaluation-store availability separate from healthy serving', () => {
    const result = deriveAstraActivationSummary(readiness({
      evidence_store_available: false,
      routing_infrastructure_ready: false,
      certified_task_classes: 0,
      routable_task_classes: 0,
      certification: [],
    }))

    expect(result?.state).toBe('evidence_unavailable')
    expect(result?.all_models_serving).toBe(true)
    expect(result?.stages.find((stage) => stage.id === 'evidence')?.ready).toBe(false)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(false)
  })

  it('reports partial certification instead of overstating route eligibility', () => {
    const result = deriveAstraActivationSummary(readiness({
      certified_task_classes: 1,
      routable_task_classes: 1,
      certification: [
        readiness().certification[0],
        {
          ...readiness().certification[1],
          certified_eligible: false,
          actually_routable: false,
          evaluation_score: null,
          evaluation_samples: 0,
        },
      ],
    }))

    expect(result?.state).toBe('certification_partial')
    expect(result?.label).toBe('1/2 task classes routable')
    expect(result?.stages.find((stage) => stage.id === 'certification')?.ready).toBe(false)
  })

  it('returns no derived status when safe readiness metadata is unavailable', () => {
    expect(deriveAstraActivationSummary(null)).toBeNull()
  })
})
