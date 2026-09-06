import { describe, expect, it } from 'vitest'
import {
  NATIVE_INTELLIGENCE_MAX_EVIDENCE_AGE_MS,
  NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES,
  isValidNativeIntelligenceModelDescriptor,
  selectNativeIntelligenceModel,
  type NativeIntelligenceEvaluationEvidence,
  type NativeIntelligenceModelDescriptor,
} from '../native-intelligence-model-platform'

const external: NativeIntelligenceModelDescriptor = {
  id: 'external-general',
  provider: 'openai',
  model: 'external-general-model',
  ownership: 'external',
  lifecycle: 'production',
  capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
  context_window: 128_000,
  streaming: true,
  latency_class: 'standard',
  cost_class: 'standard',
}

const native: NativeIntelligenceModelDescriptor = {
  id: 'blackstar-native-v0.1',
  provider: 'compatible',
  model: 'blackstar-native-v0.1',
  ownership: 'blackstar',
  lifecycle: 'candidate',
  capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
  context_window: 131_072,
  streaming: true,
  latency_class: 'standard',
  cost_class: 'standard',
}

const NOW = '2026-09-06T12:00:00.000Z'

function descriptorFor(modelId: string): NativeIntelligenceModelDescriptor {
  if (modelId === native.id) return native
  if (modelId === external.id) return external
  return { ...external, id: modelId }
}

function evidence(
  model_id: string,
  score: number,
  overrides: Partial<NativeIntelligenceEvaluationEvidence> = {},
): NativeIntelligenceEvaluationEvidence {
  const descriptor = descriptorFor(model_id)
  return {
    model_id,
    provider: descriptor.provider,
    model: descriptor.model,
    suite_id: 'reasoning-suite-v1',
    task_class: 'reasoning',
    score,
    sample_count: 100,
    verified: true,
    completed_at: '2026-09-06T10:00:00.000Z',
    ...overrides,
  }
}

describe('Blackstar Native Intelligence model platform', () => {
  it('keeps Blackstar-owned and external models in the same model contract', () => {
    expect(isValidNativeIntelligenceModelDescriptor(native)).toBe(true)
    expect(isValidNativeIntelligenceModelDescriptor(external)).toBe(true)
    expect(native.ownership).toBe('blackstar')
    expect(external.ownership).toBe('external')
  })

  it('selects a Blackstar model only when verified task-specific evidence makes it the winner', () => {
    const decision = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(external.id, 0.86), evidence(native.id, 0.92)],
      request: {
        task_class: 'reasoning',
        required_capabilities: ['reasoning'],
        fallback_model_id: external.id,
        now: NOW,
      },
    })

    expect(decision).toMatchObject({
      model_id: native.id,
      provider: 'compatible',
      ownership: 'blackstar',
      source: 'verified_evaluation',
      evaluation_score: 0.92,
      evaluation_samples: 100,
    })
  })

  it('does not promote a native model on unverified or undersized evaluation evidence', () => {
    const decision = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [
        evidence(native.id, 0.99, { verified: false }),
        evidence(native.id, 0.98, { sample_count: NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES - 1 }),
      ],
      request: {
        task_class: 'reasoning',
        fallback_model_id: external.id,
        now: NOW,
      },
    })

    expect(decision).toEqual({
      model_id: external.id,
      provider: external.provider,
      model: external.model,
      ownership: 'external',
      source: 'explicit_fallback',
      evaluation_score: null,
      evaluation_samples: 0,
    })
  })

  it('expires stale routing evidence and falls back explicitly', () => {
    const tooOld = new Date(Date.parse(NOW) - NATIVE_INTELLIGENCE_MAX_EVIDENCE_AGE_MS - 1).toISOString()
    const decision = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(native.id, 0.99, { completed_at: tooOld })],
      request: {
        task_class: 'reasoning',
        fallback_model_id: external.id,
        now: NOW,
      },
    })

    expect(decision?.model_id).toBe(external.id)
    expect(decision?.source).toBe('explicit_fallback')
  })

  it('accepts evidence exactly on the freshness boundary and rejects future completion timestamps', () => {
    const boundary = new Date(Date.parse(NOW) - NATIVE_INTELLIGENCE_MAX_EVIDENCE_AGE_MS).toISOString()
    const accepted = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(native.id, 0.94, { completed_at: boundary })],
      request: { task_class: 'reasoning', fallback_model_id: external.id, now: NOW },
    })
    const future = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(native.id, 1, { completed_at: '2026-09-06T12:00:00.001Z' })],
      request: { task_class: 'reasoning', fallback_model_id: external.id, now: NOW },
    })

    expect(accepted?.model_id).toBe(native.id)
    expect(future?.model_id).toBe(external.id)
    expect(future?.source).toBe('explicit_fallback')
  })

  it('allows callers to tighten but not accidentally bypass evidence age with a negative window', () => {
    const twoHoursOld = '2026-09-06T10:00:00.000Z'
    const tightened = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(native.id, 0.99, { completed_at: twoHoursOld })],
      request: {
        task_class: 'reasoning',
        fallback_model_id: external.id,
        now: NOW,
        max_evidence_age_ms: 60 * 60 * 1000,
      },
    })
    const zeroed = selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [evidence(native.id, 0.99)],
      request: {
        task_class: 'reasoning',
        fallback_model_id: external.id,
        now: NOW,
        max_evidence_age_ms: -1,
      },
    })

    expect(tightened?.source).toBe('explicit_fallback')
    expect(zeroed?.source).toBe('explicit_fallback')
  })

  it('fails closed when no model has qualified evidence and no explicit fallback is supplied', () => {
    expect(selectNativeIntelligenceModel({
      models: [external, native],
      evidence: [],
      request: { task_class: 'reasoning', now: NOW },
    })).toBeNull()
  })

  it('rejects models that cannot satisfy capability or context requirements before scoring', () => {
    const tinyVisionless = {
      ...native,
      id: 'blackstar-tiny',
      capabilities: ['text', 'reasoning'] as const,
      context_window: 8_192,
    }
    const decision = selectNativeIntelligenceModel({
      models: [external, tinyVisionless],
      evidence: [
        evidence(external.id, 0.70, { task_class: 'agentic' }),
        evidence(tinyVisionless.id, 0.99, {
          provider: tinyVisionless.provider,
          model: tinyVisionless.model,
          task_class: 'agentic',
        }),
      ],
      request: {
        task_class: 'agentic',
        required_capabilities: ['tools'],
        min_context_window: 32_000,
        fallback_model_id: external.id,
        now: NOW,
      },
    })

    expect(decision?.model_id).toBe(external.id)
    expect(decision?.source).toBe('verified_evaluation')
  })

  it('uses weighted verified evidence and deterministic tie-breaking', () => {
    const alternate = { ...external, id: 'a-external', model: 'a-model' }
    const decision = selectNativeIntelligenceModel({
      models: [native, alternate],
      evidence: [
        evidence(native.id, 0.90, { sample_count: 20 }),
        evidence(native.id, 0.80, { sample_count: 80, suite_id: 'reasoning-suite-v2' }),
        evidence(alternate.id, 0.82, { provider: alternate.provider, model: alternate.model, sample_count: 100 }),
      ],
      request: { task_class: 'reasoning', now: NOW },
    })

    expect(decision?.model_id).toBe('a-external')
    expect(decision?.evaluation_score).toBeCloseTo(0.82)
  })

  it('never turns model routing metadata into execution authority', () => {
    const decision = selectNativeIntelligenceModel({
      models: [native],
      evidence: [evidence(native.id, 0.95)],
      request: { task_class: 'reasoning', now: NOW },
    })
    const rendered = JSON.stringify(decision)

    expect(rendered).not.toMatch(/tool_grant|approval|permission|delegation|execution_authority/i)
    expect(Object.keys(decision ?? {}).sort()).toEqual([
      'evaluation_samples',
      'evaluation_score',
      'model',
      'model_id',
      'ownership',
      'provider',
      'source',
    ])
  })
})
