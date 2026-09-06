import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_CASE_COUNT,
  astraCertificationSuiteId,
  getAstraCertificationBenchmarkCase,
  isAstraCertificationTaskClass,
  listAstraCertificationBenchmarkCases,
} from '@/lib/evals/astra-certification-benchmark-suite'

const supported = ['general', 'reasoning', 'coding', 'tool_use', 'agentic'] as const

describe('Astra certification benchmark suite', () => {
  it.each(supported)('defines 20 distinct immutable cases for %s', (taskClass) => {
    const cases = listAstraCertificationBenchmarkCases(taskClass)
    expect(cases).toHaveLength(ASTRA_CERTIFICATION_CASE_COUNT)
    expect(new Set(cases.map((entry) => entry.caseId)).size).toBe(ASTRA_CERTIFICATION_CASE_COUNT)
    expect(new Set(cases.map((entry) => entry.prompt)).size).toBe(ASTRA_CERTIFICATION_CASE_COUNT)
    expect(cases.every((entry) => entry.suiteId === astraCertificationSuiteId(taskClass))).toBe(true)
    expect(cases.every((entry) => entry.criteria.length >= 4)).toBe(true)
  })

  it('resolves only exact server-owned case ids', () => {
    const benchmarkCase = listAstraCertificationBenchmarkCases('reasoning')[0]
    expect(benchmarkCase).toBeDefined()
    expect(getAstraCertificationBenchmarkCase('reasoning', benchmarkCase!.caseId)).toEqual(benchmarkCase)
    expect(getAstraCertificationBenchmarkCase('reasoning', `${benchmarkCase!.caseId}-forged`)).toBeNull()
  })

  it('does not allow text-only vision certification', () => {
    expect(isAstraCertificationTaskClass('vision')).toBe(false)
    expect(getAstraCertificationBenchmarkCase('vision', 'v1-01-constraint-satisfaction')).toBeNull()
  })
})
