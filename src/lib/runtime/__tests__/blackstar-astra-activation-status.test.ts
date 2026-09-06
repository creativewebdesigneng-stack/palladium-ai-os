import { describe, expect, it } from 'vitest'
import { deriveAstraActivationSummary } from '../blackstar-astra-activation-status'

function readiness(overrides: Record<string, unknown> = {}) {
  return {
    configured: true,
    evidence_store_available: true,
    routing_infrastructure_ready: true,
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
  it('does not treat infrastructure readiness as model certification', () => {
    const result = deriveAstraActivationSummary(readiness())

    expect(result?.state).toBe('routing_ready')
    expect(result?.label).toContain('certification still required')
    expect(result?.certification_required).toBe(true)
  })

  it('fails closed when the engine is not configured', () => {
    const result = deriveAstraActivationSummary(readiness({
      configured: false,
      routing_infrastructure_ready: false,
    }))

    expect(result?.state).toBe('not_configured')
    expect(result?.stages.find((stage) => stage.id === 'configured')?.ready).toBe(false)
  })

  it('keeps serving readiness separate from configuration', () => {
    const result = deriveAstraActivationSummary(readiness({
      routing_infrastructure_ready: false,
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
  })

  it('keeps evaluation-store availability separate from healthy serving', () => {
    const result = deriveAstraActivationSummary(readiness({
      evidence_store_available: false,
      routing_infrastructure_ready: false,
    }))

    expect(result?.state).toBe('evidence_unavailable')
    expect(result?.all_models_serving).toBe(true)
    expect(result?.stages.find((stage) => stage.id === 'evidence')?.ready).toBe(false)
    expect(result?.stages.find((stage) => stage.id === 'routing')?.ready).toBe(false)
  })

  it('returns no derived status when safe readiness metadata is unavailable', () => {
    expect(deriveAstraActivationSummary(null)).toBeNull()
  })
})
