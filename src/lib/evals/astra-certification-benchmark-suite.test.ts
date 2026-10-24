import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_CASE_COUNT,
  astraCertificationSuiteId,
  astraCertificationVersionForClass,
  getAstraCertificationBenchmarkCase,
  listAstraCertificationBenchmarkCases,
} from './astra-certification-benchmark-suite'
import { ASTRA_DIVERSE_REASONING_CASES, ASTRA_DIVERSE_CODING_CASES } from './astra-certification-diverse-text-cases'
import { ASTRA_DIVERSE_AGENTIC_CASES, ASTRA_DIVERSE_GENERAL_CASES, ASTRA_DIVERSE_TOOL_USE_CASES } from './astra-certification-diverse-operational-cases'

describe('Astra v2 reasoning and coding calibration', () => {
  it('contains exactly 20 substantive, independently distinguishable scenarios per upgraded class', () => {
    for (const taskClass of ['reasoning', 'coding'] as const) {
      const cases = listAstraCertificationBenchmarkCases(taskClass)
      const scenarios = taskClass === 'reasoning' ? ASTRA_DIVERSE_REASONING_CASES : ASTRA_DIVERSE_CODING_CASES
      expect(cases).toHaveLength(ASTRA_CERTIFICATION_CASE_COUNT)
      expect(scenarios).toHaveLength(ASTRA_CERTIFICATION_CASE_COUNT)
      expect(new Set(scenarios).size).toBe(ASTRA_CERTIFICATION_CASE_COUNT)
      expect(new Set(cases.map(c => c.prompt)).size).toBe(ASTRA_CERTIFICATION_CASE_COUNT)
      for (let i=0; i<cases.length; i++) {
        expect(cases[i]?.prompt).toContain(scenarios[i]!)
        expect(scenarios[i]!.length).toBeGreaterThan(95)
        expect(cases[i]?.caseId).toMatch(/^v2-\d{2}-/)
        expect(cases[i]?.suiteId).toBe(astraCertificationSuiteId(taskClass))
        expect(cases[i]?.modality).toBe('text')
      }
    }
  })

  it('keeps vision image fixtures and their v1 IDs intact, including deterministic media lookup', () => {
    const vision = listAstraCertificationBenchmarkCases('vision')
    expect(vision).toHaveLength(20)
    expect(astraCertificationVersionForClass('vision')).toBe('v1')
    expect(vision.every(c => /^v1-\d{2}-/.test(c.caseId))).toBe(true)
    expect(vision[0]?.suiteId).toBe('blackstar-astra-vision-certification-v1')
  })

  it('does not accept stale v1 text IDs as if they were new v2 signed cases', () => {
    const first = listAstraCertificationBenchmarkCases('reasoning')[0]!
    expect(getAstraCertificationBenchmarkCase('reasoning', first.caseId)).toEqual(first)
    expect(getAstraCertificationBenchmarkCase('reasoning', first.caseId.replace(/^v2-/, 'v1-'))).toBeNull()
    expect(getAstraCertificationBenchmarkCase('coding', 'v1-01-constraint-satisfaction')).toBeNull()
    expect(astraCertificationVersionForClass('general')).toBe('v2')
    expect(astraCertificationVersionForClass('agentic')).toBe('v2')
    expect(astraCertificationVersionForClass('tool_use')).toBe('v2')
  })

  it('pins v2 criteria and keeps cross-class prompts distinct', () => {
    const reasoning = listAstraCertificationBenchmarkCases('reasoning')
    const coding = listAstraCertificationBenchmarkCases('coding')
    for(let i=0;i<20;i++){
      expect(reasoning[i]?.criteria).toContain('logical validity')
      expect(coding[i]?.criteria).toContain('test quality')
      expect(reasoning[i]?.prompt).not.toEqual(coding[i]?.prompt)
      expect(reasoning[i]?.caseId).toEqual(coding[i]?.caseId)
    }
  })
})

describe('Astra diverse General Intelligence, tool-use and agentic suites', () => {
  const expected = [
    ['general', ASTRA_DIVERSE_GENERAL_CASES],
    ['tool_use', ASTRA_DIVERSE_TOOL_USE_CASES],
    ['agentic', ASTRA_DIVERSE_AGENTIC_CASES],
  ] as const

  it.each(expected)('%s has 20 distinct v2 prompts while preserving signed case identity', (taskClass, prompts) => {
    const cases = listAstraCertificationBenchmarkCases(taskClass)
    expect(cases).toHaveLength(ASTRA_CERTIFICATION_CASE_COUNT)
    expect(prompts).toHaveLength(ASTRA_CERTIFICATION_CASE_COUNT)
    expect(new Set(prompts).size).toBe(20)
    for (let index = 0; index < 20; index++) {
      const entry = cases[index]!
      expect(entry.prompt).toContain(prompts[index]!)
      expect(entry.caseId).toMatch(/^v2-\d{2}-/)
      expect(entry.modality).toBe('text')
      expect(entry.suiteId).toBe(astraCertificationSuiteId(taskClass))
      expect(getAstraCertificationBenchmarkCase(taskClass, entry.caseId)).toEqual(entry)
      expect(getAstraCertificationBenchmarkCase(taskClass, entry.caseId.replace(/^v2-/, 'v1-'))).toBeNull()
    }
  })

  it('does not mix operational test families or claim public cases are blind tests', () => {
    const all = expected.flatMap(([taskClass]) => listAstraCertificationBenchmarkCases(taskClass).map(c => c.prompt))
    expect(all).toHaveLength(60)
    expect(new Set(all).size).toBe(60)
    expect(listAstraCertificationBenchmarkCases('vision')[0]?.caseId).toMatch(/^v1-/)
  })
})
