import { describe, expect, it } from 'vitest'
import { hasLinkedAstraEvaluationEvidence } from './astra-evaluation-evidence-links'

const runId = 'case-run-1'
const responseA = { id: 'response-a', run_id: runId, provider: 'compatible', model: 'astra-model' }
const responseB = { id: 'response-b', run_id: runId, provider: 'groq', model: 'comparison-model' }
const criteria = { names: ['correctness'], judgeProvider: 'freellm', judgeModel: 'pinned-judge' }
const scoreA = { run_id: runId, response_id: 'response-a', evaluator_type: 'llm_judge', score: 80, criteria }
const scoreB = { run_id: runId, response_id: 'response-b', evaluator_type: 'llm_judge', score: 77, criteria }
const good = { runId, responses: [responseA,responseB], scores: [scoreA,scoreB], judgeProvider: 'freellm', judgeModel: 'pinned-judge', expectedCriteria: ['correctness'] }

describe('Astra evidence requires exact response-to-score linkage', () => {
  it('accepts precisely linked independent judge scores including DB numeric text', () => {
    expect(hasLinkedAstraEvaluationEvidence(good)).toBe(true)
    expect(hasLinkedAstraEvaluationEvidence({ ...good, scores: [scoreA, {...scoreB, score: '77.5'}] })).toBe(true)
  })
  it('rejects duplicate scores even when counts match the responses', () => {
    expect(hasLinkedAstraEvaluationEvidence({ ...good, scores: [scoreA, {...scoreA}] })).toBe(false)
  })
  it('rejects scores attached to a different or missing response and cross-run rows', () => {
    for (const invalid of [
      {...scoreB, response_id: 'missing'},
      {...scoreB, run_id: 'someone-else'},
      {...scoreB, response_id: 'response-a'},
    ]) expect(hasLinkedAstraEvaluationEvidence({ ...good, scores: [scoreA, invalid] })).toBe(false)
    expect(hasLinkedAstraEvaluationEvidence({ ...good, responses: [{...responseA, run_id: 'someone-else'},responseB] })).toBe(false)
    expect(hasLinkedAstraEvaluationEvidence({ ...good, responses: [responseA,{...responseB, id: 'response-a'}] })).toBe(false)
  })
  it('rejects wrong scoring authority, changed criteria and invalid values', () => {
    const bad = [
      {...scoreA, evaluator_type: 'manual'},
      {...scoreA, score: '100 out of 100'},
      {...scoreA, score: '  '},
      {...scoreA, score: -1},
      {...scoreA, score: Number.NaN},
      {...scoreA, score: 101},
      {...scoreA, criteria: {...criteria, judgeModel: 'astra-model'}},
      {...scoreA, criteria: {...criteria, names: ['other criteria']}},
      {...scoreA, criteria: null},
    ]
    for (const modified of bad) {
      expect(hasLinkedAstraEvaluationEvidence({ ...good, scores: [modified,scoreB] })).toBe(false)
    }
  })
})
