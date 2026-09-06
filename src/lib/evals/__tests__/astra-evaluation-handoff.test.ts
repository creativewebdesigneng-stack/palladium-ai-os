import { describe, expect, it } from 'vitest'
import { astraEvaluationContestants, parseAstraEvaluationHandoff } from '../astra-evaluation-handoff'

describe('Astra evaluation handoff', () => {
  it('accepts only the exact activation source, task class and compatible provider', () => {
    const handoff = parseAstraEvaluationHandoff(new URLSearchParams({
      source: 'astra-activation',
      task_class: 'reasoning',
      provider: 'compatible',
      model: 'astra-reasoning-v1',
    }))

    expect(handoff).toEqual({
      taskClass: 'reasoning',
      provider: 'compatible',
      model: 'astra-reasoning-v1',
      runName: 'Astra reasoning evaluation',
      criteria: 'correctness, reasoning quality, robustness',
    })
  })

  it('preselects the exact Astra serving identity without making it the judge', () => {
    const handoff = parseAstraEvaluationHandoff(new URLSearchParams({
      source: 'astra-activation',
      task_class: 'coding',
      provider: 'compatible',
      model: 'astra-code-v2',
    }))

    expect(handoff).not.toBeNull()
    expect(astraEvaluationContestants(handoff!)).toEqual([
      { provider: 'compatible', model: 'astra-code-v2', label: 'Blackstar Astra' },
      { provider: 'openai', model: 'gpt-5-mini', label: 'Reference candidate' },
    ])
  })

  it.each([
    { source: 'other', task_class: 'reasoning', provider: 'compatible', model: 'astra' },
    { source: 'astra-activation', task_class: 'unknown', provider: 'compatible', model: 'astra' },
    { source: 'astra-activation', task_class: 'reasoning', provider: 'openai', model: 'astra' },
    { source: 'astra-activation', task_class: 'reasoning', provider: 'compatible', model: '' },
  ])('fails closed for invalid handoff %#', (input) => {
    expect(parseAstraEvaluationHandoff(new URLSearchParams(input))).toBeNull()
  })

  it('rejects oversized model identifiers', () => {
    expect(parseAstraEvaluationHandoff(new URLSearchParams({
      source: 'astra-activation',
      task_class: 'general',
      provider: 'compatible',
      model: 'x'.repeat(201),
    }))).toBeNull()
  })
})
