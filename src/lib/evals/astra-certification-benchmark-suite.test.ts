import { describe, expect, it } from 'vitest'
import {
  ASTRA_CERTIFICATION_CASE_COUNT,
  astraCertificationSuiteId,
  astraCertificationVersionForClass,
  getAstraCertificationBenchmarkCase,
  listAstraCertificationBenchmarkCases,
} from './astra-certification-benchmark-suite'
import { ASTRA_DIVERSE_REASONING_CASES, ASTRA_DIVERSE_CODING_CASES } from './astra-certification-diverse-text-cases'

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
    expect(astraCertificationVersionForClass('general')).toBe('v1')
    expect(astraCertificationVersionForClass('agentic')).toBe('v1')
    expect(astraCertificationVersionForClass('tool_use')).toBe('v1')
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
