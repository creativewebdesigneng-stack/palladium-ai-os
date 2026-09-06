import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_CASE_COUNT,
  astraCertificationSuiteId,
  getAstraCertificationBenchmarkCase,
  isAstraCertificationTaskClass,
  listAstraCertificationBenchmarkCases,
} from '@/lib/evals/astra-certification-benchmark-suite'

const supported = ['general', 'reasoning', 'coding', 'tool_use', 'agentic', 'vision'] as const

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

  it('marks vision cases as genuinely multimodal', () => {
    expect(isAstraCertificationTaskClass('vision')).toBe(true)
    const cases = listAstraCertificationBenchmarkCases('vision')
    expect(cases).toHaveLength(20)
    expect(cases.every((entry) => entry.modality === 'vision')).toBe(true)
    expect(getAstraCertificationBenchmarkCase('vision', cases[0]!.caseId)).toEqual(cases[0])
  })
})
