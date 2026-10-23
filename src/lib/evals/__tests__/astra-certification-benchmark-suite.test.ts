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


describe('Astra certification current-profile gating contract', () => {
  it('requires signed persisted verifier evidence before the plan counts cases', async () => {
    const { readFile } = await import('node:fs/promises')
    const [planSource, verifierSource] = await Promise.all([
      readFile(new URL('../astra-certification-benchmark.server.ts', import.meta.url), 'utf8'),
      readFile(new URL('../astra-evaluation-verifier.server.ts', import.meta.url), 'utf8'),
    ])
    expect(planSource).toContain('const verifiedCaseIds = await listVerifiedAstraEvaluationCaseIds(scope)')
    expect(verifierSource).toContain("metadata?.['model'] === model")
    expect(verifierSource).toContain("sameAstraCertificationExecutionProfile(metadata?.['execution_profile'], expectedExecution.profile)")
    expect(verifierSource).toContain("metadata?.['execution_prompt_hash'] === expectedExecution.executionPromptHash")
    expect(verifierSource).toContain("return validProvenanceSignature(metadata?.['provenance_signature']")
    expect(verifierSource).toContain('hasLinkedAstraEvaluationEvidence({')
    expect(verifierSource).toContain('isTrustedAstraCertificationJudge(run.judge_provider, run.judge_model)')
    const links = await readFile(new URL('../astra-evaluation-evidence-links.ts', import.meta.url), 'utf8')
    expect(links).toContain('scored.has(score.response_id)')
    expect(links).toContain('score.run_id !== args.runId')
  })
})
