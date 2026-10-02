import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  summariseGroqEvidence,
  shouldRouteToGroq,
  type GroqEvidenceSample,
} from '../groq-evidence-routing'

const verifier = readFileSync(new URL('../groq-evaluation-verifier.server.ts', import.meta.url), 'utf8')
const arena = readFileSync(new URL('../model-arena.functions.ts', import.meta.url), 'utf8')
const routing = readFileSync(new URL('../../runtime/native-intelligence-runtime-routing.server.ts', import.meta.url), 'utf8')
const reconciliation = readFileSync(new URL('../../../../supabase/migrations/20261002110000_evaluation_foundation_reconciliation.sql', import.meta.url), 'utf8')

function samples(count: number, patch: Partial<GroqEvidenceSample> = {}): GroqEvidenceSample[] {
  return Array.from({ length: count }, () => ({
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    taskClass: 'general',
    score: 0.82,
    latencyMs: 240,
    inputTokens: 400,
    outputTokens: 120,
    toolUseObserved: false,
    costUsd: null,
    ...patch,
  }))
}

describe('Groq evidence-qualified routing', () => {
  it('requires the Native Intelligence 20-sample floor', () => {
    const evidence = summariseGroqEvidence(samples(19), 'general')
    expect(evidence.qualified).toBe(false)
    expect(evidence.reasons.join(' ')).toContain('20')
  })

  it('does not qualify low-quality evidence even when latency is low', () => {
    const evidence = summariseGroqEvidence(samples(20, { score: 0.7, latencyMs: 10 }), 'general')
    expect(evidence.qualified).toBe(false)
    expect(shouldRouteToGroq(evidence)).toBe(false)
  })

  it('requires explicit tool-call observations for tool-use workloads', () => {
    const weak = summariseGroqEvidence(samples(20, { taskClass: 'tool_use', toolUseObserved: false }), 'tool_use')
    expect(weak.qualified).toBe(false)
    const strong = summariseGroqEvidence(samples(20, { taskClass: 'tool_use', toolUseObserved: true }), 'tool_use')
    expect(strong.qualified).toBe(true)
  })

  it('keeps certification independent from Groq self-judging', () => {
    expect(verifier).toContain("run.judge_provider !== 'groq'")
    expect(verifier).toContain("GROQ_EVIDENCE_MIN_RUNS = 20")
    expect(verifier).toContain("p_provider: 'groq'")
    expect(verifier).toContain("p_model_id: GROQ_EVIDENCE_MODEL_ID")
  })

  it('uses an inert schema-only tool probe in Model Arena', () => {
    expect(arena).toContain('blackstar_evidence_probe')
    expect(arena).toContain('It has no external side effects')
    expect(arena).toContain('toolUseObserved: result.toolCalls.length > 0')
  })

  it('adds Groq only as a candidate to the provider-neutral verified router', () => {
    expect(routing).toContain('groqEvidenceDescriptor')
    expect(routing).toContain('GROQ_EVIDENCE_MODEL_ID')
    expect(routing).toContain("lifecycle: 'candidate'")
    expect(routing).not.toContain("fallbackId: GROQ_EVIDENCE_MODEL_ID")
  })

  it('reconciles the missing evaluation foundation with correct score normalization', () => {
    expect(reconciliation).toContain('create table if not exists public.model_eval_runs')
    expect(reconciliation).toContain('create table if not exists public.model_eval_verified_evidence')
    expect(reconciliation).toContain('avg(scores.score)::numeric / 100')
    expect(reconciliation).not.toContain('avg(scores.score)::numeric / 10')
    expect(reconciliation).toContain('to service_role')
  })
})
