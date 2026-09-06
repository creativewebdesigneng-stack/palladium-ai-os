import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveBlackstarAstraRuntimeReadiness } from '../blackstar-astra-runtime-readiness.server'

const hash = 'a'.repeat(64)

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    model_id: 'blackstar-astra-v0.1',
    provider: 'compatible',
    model: 'astra-general-v1',
    suite_id: 'astra-suite-v1',
    task_class: 'general',
    score: 0.91,
    sample_count: 40,
    benchmark_hash: hash,
    evaluator_hash: 'b'.repeat(64),
    model_config_hash: 'c'.repeat(64),
    completed_at: '2026-09-06T16:00:00.000Z',
    verified_at: '2026-09-06T16:05:00.000Z',
    ...overrides,
  }
}

function evidenceSb(rows: unknown[] = [], error: Error | null = null) {
  const query: any = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn(async () => ({ data: rows, error }))
  return { from: vi.fn(() => query) }
}

function allCertificates() {
  return [
    certificate(),
    certificate({ model: 'astra-reasoning-v1', task_class: 'reasoning', score: 0.93 }),
    certificate({ model: 'astra-coding-v1', task_class: 'coding', score: 0.92 }),
    certificate({ model: 'astra-agentic-v1', task_class: 'tool_use', score: 0.90 }),
    certificate({ model: 'astra-agentic-v1', task_class: 'agentic', score: 0.89 }),
  ]
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

  it('reports verifier-backed certification and routability for exact serving identities', async () => {
    const sb = evidenceSb(allCertificates())
    const probeServing = vi.fn(async ({ model }: { model: string }) => ({
      ready: true,
      model,
      reason: 'ready' as const,
      source: 'models_endpoint' as const,
      health: 'healthy' as const,
      latency_ms: 120,
      checked_at: '2026-09-06T16:30:00.000Z',
    }))

    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb,
      probeServing: probeServing as never,
      now: '2026-09-06T17:00:00.000Z',
    })

    expect(readiness.version).toBe(2)
    expect(readiness.configured).toBe(true)
    expect(readiness.evidence_store_available).toBe(true)
    expect(readiness.routing_infrastructure_ready).toBe(true)
    expect(readiness.certified_task_classes).toBe(5)
    expect(readiness.routable_task_classes).toBe(5)
    expect(readiness.certification).toEqual(expect.arrayContaining([
      expect.objectContaining({ task_class: 'general', model: 'astra-general-v1', evidence_available: true, certified_eligible: true, actually_routable: true }),
      expect.objectContaining({ task_class: 'reasoning', model: 'astra-reasoning-v1', certified_eligible: true, actually_routable: true }),
      expect.objectContaining({ task_class: 'coding', model: 'astra-coding-v1', certified_eligible: true, actually_routable: true }),
      expect.objectContaining({ task_class: 'tool_use', model: 'astra-agentic-v1', certified_eligible: true, actually_routable: true }),
      expect.objectContaining({ task_class: 'agentic', model: 'astra-agentic-v1', certified_eligible: true, actually_routable: true }),
    ]))
    expect(JSON.stringify(readiness)).not.toMatch(/api[_-]?key|base[_-]?url|authorization|bearer|https:\/\//i)
    expect(JSON.stringify(readiness)).not.toMatch(/benchmark_hash|evaluator_hash|model_config_hash|raw_judge|prompt|response_text/i)
    expect(readiness.certification_note).toContain('Evidence presence alone is not certification')
    expect(readiness.authority_note).toContain('grants no tools')
  })

  it('exposes evidence presence without certifying stale evidence', async () => {
    const stale = allCertificates().map((row) => ({
      ...row,
      completed_at: '2026-07-01T10:00:00.000Z',
      verified_at: '2026-07-01T10:05:00.000Z',
    }))
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(stale),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: true,
        model,
        reason: 'ready' as const,
        source: 'models_endpoint' as const,
        health: 'healthy' as const,
        latency_ms: 80,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
      now: '2026-09-06T17:00:00.000Z',
    })

    expect(readiness.certification.every((item) => item.evidence_available)).toBe(true)
    expect(readiness.certified_task_classes).toBe(0)
    expect(readiness.routable_task_classes).toBe(0)
    expect(readiness.certification.every((item) => !item.certified_eligible && !item.actually_routable)).toBe(true)
  })

  it('does not replay evidence when the configured transport model identity changes', async () => {
    const rows = allCertificates()
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reasoning-v2'
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(rows),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: true,
        model,
        reason: 'ready' as const,
        source: 'models_endpoint' as const,
        health: 'healthy' as const,
        latency_ms: 70,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
      now: '2026-09-06T17:00:00.000Z',
    })

    const reasoning = readiness.certification.find((item) => item.task_class === 'reasoning')
    expect(reasoning).toMatchObject({
      model: 'astra-reasoning-v2',
      evidence_available: false,
      certified_eligible: false,
      actually_routable: false,
    })
  })

  it('keeps certified evidence separate from actual routability when serving is down', async () => {
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(allCertificates()),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: model !== 'astra-coding-v1',
        model,
        reason: model === 'astra-coding-v1' ? 'model_missing' as const : 'ready' as const,
        source: 'models_endpoint' as const,
        health: model === 'astra-coding-v1' ? 'unavailable' as const : 'healthy' as const,
        latency_ms: 50,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
      now: '2026-09-06T17:00:00.000Z',
    })

    const coding = readiness.certification.find((item) => item.task_class === 'coding')
    expect(coding?.certified_eligible).toBe(true)
    expect(coding?.actually_routable).toBe(false)
    expect(readiness.certified_task_classes).toBe(5)
    expect(readiness.routable_task_classes).toBe(4)
    expect(readiness.routing_infrastructure_ready).toBe(false)
  })

  it('fails certification and routing closed when the evidence store is unavailable', async () => {
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb([], new Error('relation does not exist')),
      probeServing: (async ({ model }: { model: string }) => ({
        ready: true,
        model,
        reason: 'ready' as const,
        source: 'models_endpoint' as const,
        health: 'healthy' as const,
        latency_ms: 50,
        checked_at: '2026-09-06T16:30:00.000Z',
      })) as never,
    })

    expect(readiness.evidence_store_available).toBe(false)
    expect(readiness.routing_infrastructure_ready).toBe(false)
    expect(readiness.certified_task_classes).toBe(0)
    expect(readiness.routable_task_classes).toBe(0)
  })

  it('does not probe serving when Astra transport is not configured', async () => {
    delete process.env['OPENAI_COMPATIBLE_BASE_URL']
    const probeServing = vi.fn()
    const readiness = await resolveBlackstarAstraRuntimeReadiness({
      sb: evidenceSb(allCertificates()),
      probeServing: probeServing as never,
      now: '2026-09-06T17:00:00.000Z',
    })

    expect(readiness.configured).toBe(false)
    expect(readiness.routing_infrastructure_ready).toBe(false)
    expect(readiness.models.every((model) => model.serving_reason === 'not_configured')).toBe(true)
    expect(readiness.certified_task_classes).toBe(5)
    expect(readiness.routable_task_classes).toBe(0)
    expect(probeServing).not.toHaveBeenCalled()
  })
})
