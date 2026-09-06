import { afterEach, describe, expect, it } from 'vitest'
import {
  hashAstraEvaluationSystemPrompt,
  signAstraEvaluationEvidence,
} from './astra-evaluation-verifier.server'

const originalServiceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

const baseEvidence = {
  runId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  orgId: null,
  taskClass: 'reasoning' as const,
  model: 'blackstar-astra-reasoning',
  prompt: 'Solve the evaluation problem.',
  systemPromptHash: hashAstraEvaluationSystemPrompt(null),
  judgeProvider: 'anthropic',
  judgeModel: 'judge-model',
  criteria: ['correctness', 'reasoning'],
  responses: [{
    id: '33333333-3333-4333-8333-333333333333',
    provider: 'compatible',
    model: 'blackstar-astra-reasoning',
    response_text: 'Verified answer',
    latency_ms: 120,
    input_tokens: 12,
    output_tokens: 20,
  }],
  scores: [{
    response_id: '33333333-3333-4333-8333-333333333333',
    evaluator_type: 'llm_judge',
    score: 94,
    verdict: 'pass',
    reasoning: 'Strong result',
    criteria: { names: ['correctness', 'reasoning'], judgeProvider: 'anthropic', judgeModel: 'judge-model' },
  }],
}

afterEach(() => {
  if (originalServiceRoleKey === undefined) delete process.env['SUPABASE_SERVICE_ROLE_KEY']
  else process.env['SUPABASE_SERVICE_ROLE_KEY'] = originalServiceRoleKey
})

describe('Astra evaluation provenance', () => {
  it('is deterministic for the same completed evidence', () => {
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-provenance-key'
    expect(signAstraEvaluationEvidence(baseEvidence)).toBe(signAstraEvaluationEvidence(baseEvidence))
  })

  it('binds the signature to run identity, response content, judge score, and system prompt state', () => {
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-provenance-key'
    const signature = signAstraEvaluationEvidence(baseEvidence)

    expect(signAstraEvaluationEvidence({
      ...baseEvidence,
      runId: '44444444-4444-4444-8444-444444444444',
    })).not.toBe(signature)

    expect(signAstraEvaluationEvidence({
      ...baseEvidence,
      responses: [{ ...baseEvidence.responses[0]!, response_text: 'tampered answer' }],
    })).not.toBe(signature)

    expect(signAstraEvaluationEvidence({
      ...baseEvidence,
      scores: [{ ...baseEvidence.scores[0]!, score: 100 }],
    })).not.toBe(signature)

    expect(signAstraEvaluationEvidence({
      ...baseEvidence,
      systemPromptHash: hashAstraEvaluationSystemPrompt('hidden benchmark steering'),
    })).not.toBe(signature)
  })

  it('normalises an empty system prompt to the same clean-context hash', () => {
    expect(hashAstraEvaluationSystemPrompt(null)).toBe(hashAstraEvaluationSystemPrompt('   '))
    expect(hashAstraEvaluationSystemPrompt('hidden')).not.toBe(hashAstraEvaluationSystemPrompt(null))
  })
})
