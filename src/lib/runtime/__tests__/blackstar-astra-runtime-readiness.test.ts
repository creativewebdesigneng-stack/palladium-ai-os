import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveBlackstarAstraRuntimeReadiness } from '../blackstar-astra-runtime-readiness.server'

function evidenceSb(error: Error | null = null) {
  const query: any = {}
  query.select = vi.fn(() => query)
  query.limit = vi.fn(async () => ({ data: [], error }))
  return { from: vi.fn(() => query) }
}

describe('Blackstar Astra runtime readiness status', () => {
  beforeEach(() => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'https://astra.example.test/v1'
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-general-v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reasoning-v1'
    process.env['BLACKSTAR_ASTRA_CODING_MODEL'] = 'astra-coding-v1'
    process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL'] = 'astra-agentic-v1'
  })

  afterEach(() => {
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    delete process.env['BLACKSTAR_ASTRA_MODEL']
    delete process.env['BLACKSTAR_ASTRA_REASONING_MODEL']
    delete process.env['BLACKSTAR_ASTRA_CODING_MODEL']
    delete process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL']
  })

  it('reports safe per-model serving state and accessible evaluation infrastructure', async () => {
    const sb = evidenceSb()
    const probeServing = vi.fn(async ({ model }: { model: string }) => ({
      ready: true,
      model,
      reason: 'ready' as const,
      source: 'models_endpoint' as const,
      checked_at: '2026-09-06T16:30:00.000Z',
    }))

    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb,
      probeServing: probeServing as never,
    })

    expect(readiness.configured).toBe(true)
    expect(readiness.evidence_store_available).toBe(true)
    expect(readiness.routing_infrastructure_ready).toBe(true)
    expect(readiness.models).toEqual(expect.arrayContaining([
      expect.objectContaining({ model: 'astra-general-v1', task_classes: ['general'], serving_ready: true }),
      expect.objectContaining({ model: 'astra-reasoning-v1', task_classes: ['reasoning'], serving_ready: true }),
      expect.objectContaining({ model: 'astra-coding-v1', task_classes: ['coding'], serving_ready: true }),
      expect.objectContaining({ model: 'astra-agentic-v1', task_classes: ['tool_use', 'agentic'], serving_ready: true }),
    ]))
    expect(JSON.stringify(readiness)).not.toMatch(/api[_-]?key|base[_-]?url|authorization|bearer|https:\/\//i)
    expect(readiness.certification_note).toContain('does not mean a model is certified')
    expect(readiness.authority_note).toContain('grants no tools')
  })

  it('fails routing infrastructure readiness closed when the evidence store is unavailable', async () => {
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(new Error('relation does not exist')),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: true,
        model,
        reason: 'ready' as const,
        source: 'models_endpoint' as const,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
    })

    expect(readiness.evidence_store_available).toBe(false)
    expect(readiness.routing_infrastructure_ready).toBe(false)
  })

  it('does not probe serving when Astra transport is not configured', async () => {
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    const probeServing = vi.fn()
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(),
      probeServing: probeServing as never,
    })

    expect(readiness.configured).toBe(false)
    expect(readiness.routing_infrastructure_ready).toBe(false)
    expect(readiness.models.every((model) => model.serving_reason === 'not_configured')).toBe(true)
    expect(probeServing).not.toHaveBeenCalled()
  })

  it('requires every configured specialist identity to be live before infrastructure is ready', async () => {
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: model !== 'astra-coding-v1',
        model,
        reason: model === 'astra-coding-v1' ? 'model_missing' as const : 'ready' as const,
        source: 'models_endpoint' as const,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
    })

    expect(readiness.models.find((item) => item.model === 'astra-coding-v1')?.serving_ready).toBe(false)
    expect(readiness.routing_infrastructure_ready).toBe(false)
  })
})
