import { describe, expect, it } from 'vitest'
import {
  mapNativeIntelligenceEvaluationEvidence,
  NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT,
  toNativeIntelligenceEvaluationEvidence,
} from '../native-intelligence-evaluation-evidence'
import {
  NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES,
  selectNativeIntelligenceModel,
  type NativeIntelligenceModelDescriptor,
} from '../native-intelligence-model-platform'

const hash = 'a'.repeat(64)

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    model_id: 'blackstar-native-v0.1',
    suite_id: 'reasoning-suite-v1',
    task_class: 'reasoning',
    score: 0.93,
    sample_count: 40,
    benchmark_hash: hash,
    evaluator_hash: 'b'.repeat(64),
    model_config_hash: 'c'.repeat(64),
    completed_at: '2026-09-06T10:00:00.000Z',
    verified_at: '2026-09-06T10:05:00.000Z',
    ...overrides,
  }
}

const external: NativeIntelligenceModelDescriptor = {
  id: 'external-general',
  provider: 'openai',
  model: 'external-general-model',
  ownership: 'external',
  lifecycle: 'production',
  capabilities: ['text', 'reasoning'],
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
  capabilities: ['text', 'reasoning'],
  context_window: 131_072,
  streaming: true,
  latency_class: 'standard',
  cost_class: 'standard',
}

describe('Native Intelligence Evaluation Lab evidence', () => {
  it('maps a reproducible verifier certificate into the narrow routing contract', () => {
    expect(toNativeIntelligenceEvaluationEvidence(certificate())).toEqual({
      model_id: 'blackstar-native-v0.1',
      suite_id: 'reasoning-suite-v1',
      task_class: 'reasoning',
      score: 0.93,
      sample_count: 40,
      verified: true,
      completed_at: '2026-09-06T10:00:00.000Z',
    })
  })

  it('fails closed on undersized, malformed, or non-reproducible certificates', () => {
    const invalid = [
      certificate({ sample_count: NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES - 1 }),
      certificate({ score: 1.01 }),
      certificate({ score: Number.NaN }),
      certificate({ task_class: 'unknown' }),
      certificate({ benchmark_hash: 'not-a-hash' }),
      certificate({ evaluator_hash: '' }),
      certificate({ model_config_hash: 'f'.repeat(63) }),
      certificate({ verified_at: '2026-09-06T09:59:59.000Z' }),
    ]

    expect(mapNativeIntelligenceEvaluationEvidence(invalid)).toEqual([])
  })

  it('accepts Supabase numeric strings without accepting arbitrary numeric input', () => {
    expect(toNativeIntelligenceEvaluationEvidence(certificate({ score: '0.875' }))?.score).toBe(0.875)
    expect(toNativeIntelligenceEvaluationEvidence(certificate({ score: '' }))).toBeNull()
    expect(toNativeIntelligenceEvaluationEvidence(certificate({ score: 'Infinity' }))).toBeNull()
  })

  it('never selects raw Arena prompt, response, judge, or execution-authority fields', () => {
    const poisoned = certificate({
      prompt: 'secret benchmark prompt',
      response_text: 'raw model output',
      reason: 'private judge reasoning',
      raw_judge_text: 'hidden judge transcript',
      tool_grants: ['*'],
      approval_granted: true,
      delegation: 'admin-agent',
      execution_authority: true,
    })
    const evidence = toNativeIntelligenceEvaluationEvidence(poisoned)
    const rendered = JSON.stringify(evidence)

    expect(rendered).not.toContain('secret benchmark prompt')
    expect(rendered).not.toContain('raw model output')
    expect(rendered).not.toContain('private judge reasoning')
    expect(rendered).not.toContain('hidden judge transcript')
    expect(rendered).not.toMatch(/tool_grants|approval_granted|delegation|execution_authority/)
    expect(NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT).not.toMatch(
      /prompt|response_text|reason|raw_judge_text|tool|approval|delegation|execution/i,
    )
  })

  it('lets only persisted certificate-shaped evidence influence the existing #288 selector', () => {
    const evidence = mapNativeIntelligenceEvaluationEvidence([
      certificate({ model_id: native.id, score: 0.94 }),
      certificate({
        model_id: external.id,
        score: 0.88,
        benchmark_hash: 'd'.repeat(64),
        model_config_hash: 'e'.repeat(64),
      }),
    ])

    const decision = selectNativeIntelligenceModel({
      models: [external, native],
      evidence,
      request: {
        task_class: 'reasoning',
        required_capabilities: ['reasoning'],
        fallback_model_id: external.id,
      },
    })

    expect(decision).not.toBeNull()
    if (!decision) throw new Error('Expected Native Intelligence selector to return a decision')

    expect(decision).toMatchObject({
      model_id: native.id,
      ownership: 'blackstar',
      source: 'verified_evaluation',
      evaluation_samples: 40,
    })
    expect(decision.evaluation_score).toBeCloseTo(0.94, 10)
  })
})
