import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

export const ASTRA_CERTIFICATION_SUITE_VERSION = 'v1' as const
export const ASTRA_CERTIFICATION_CASE_COUNT = 20

export type AstraCertificationTaskClass = NativeIntelligenceTaskClass

export type AstraCertificationBenchmarkCase = {
  suiteId: string
  caseId: string
  taskClass: AstraCertificationTaskClass
  name: string
  prompt: string
  criteria: readonly string[]
  modality: 'text' | 'vision'
}

const CASE_TOPICS = [
  'constraint-satisfaction','ambiguity-resolution','multi-step-planning','counterfactual-analysis','error-detection',
  'information-synthesis','tradeoff-analysis','causal-reasoning','edge-case-handling','instruction-following',
  'verification','decomposition','consistency','uncertainty-calibration','optimization','robustness','schema-compliance',
  'adversarial-input','recovery-planning','final-validation',
] as const

const PROMPT_BUILDERS: Record<AstraCertificationTaskClass, (topic: string, index: number) => string> = {
  general: (topic, index) => `Benchmark case ${index + 1}/20 (${topic}). A project has three teams, two deadlines, a fixed budget, and incomplete requirements. Produce a concise decision that identifies missing information, states assumptions, prioritises actions, and includes a verification checklist. Do not invent facts.`,
  reasoning: (topic, index) => `Reasoning benchmark ${index + 1}/20 (${topic}). Five tasks A-E have dependencies A before C, B before D, C and D before E. A takes 2 units, B 3, C 2, D 1, E 2. Two workers can run independent tasks in parallel. Determine the minimum completion time, give a valid schedule, and explain how you verified optimality.`,
  coding: (topic, index) => `Coding benchmark ${index + 1}/20 (${topic}). Design a TypeScript function that accepts an array of timestamped events, removes exact duplicates, preserves stable chronological order, rejects invalid timestamps, and returns both valid events and structured validation errors. Explain complexity and provide focused tests for edge cases.`,
  tool_use: (topic, index) => `Tool-use benchmark ${index + 1}/20 (${topic}). You have read-only search, a calculator, and a database lookup tool. Describe the exact tool-call plan for answering a request that combines a current account balance, a percentage calculation, and a policy lookup. Minimise calls, do not fabricate tool results, and state when approval would be required for any side effect.`,
  agentic: (topic, index) => `Agentic benchmark ${index + 1}/20 (${topic}). Plan a bounded multi-agent workflow to investigate a production regression, identify the root cause, propose a fix, test it, and prepare a release. Assign roles, define handoff criteria, verification gates, rollback conditions, and explicit approval points.`,
  vision: (topic, index) => `Vision benchmark ${index + 1}/20 (${topic}). Inspect the supplied image carefully. Report the number of vertical coloured bars, identify the colour family of the left-most bar, state whether the small gold marker is on the left or right half, and rank the bars from shortest to tallest. Answer only from visible evidence and mention uncertainty if any feature is ambiguous.`,
}

const CRITERIA: Record<AstraCertificationTaskClass, readonly string[]> = {
  general: ['correctness','instruction adherence','uncertainty calibration','verification quality'],
  reasoning: ['correctness','logical validity','constraint handling','verification quality'],
  coding: ['correctness','robustness','test quality','complexity awareness'],
  tool_use: ['tool selection','call efficiency','non-fabrication','approval awareness'],
  agentic: ['plan quality','delegation discipline','verification gates','approval discipline'],
  vision: ['visual grounding','object counting','colour recognition','spatial reasoning','relative-size ordering','non-fabrication'],
}

export function isAstraCertificationTaskClass(taskClass: NativeIntelligenceTaskClass): taskClass is AstraCertificationTaskClass {
  return ['general','reasoning','coding','tool_use','agentic','vision'].includes(taskClass)
}

export function astraCertificationSuiteId(taskClass: AstraCertificationTaskClass): string {
  return `blackstar-astra-${taskClass}-certification-${ASTRA_CERTIFICATION_SUITE_VERSION}`
}

export function listAstraCertificationBenchmarkCases(taskClass: AstraCertificationTaskClass): AstraCertificationBenchmarkCase[] {
  const suiteId = astraCertificationSuiteId(taskClass)
  return CASE_TOPICS.map((topic, index) => ({
    suiteId,
    caseId: `${ASTRA_CERTIFICATION_SUITE_VERSION}-${String(index + 1).padStart(2, '0')}-${topic}`,
    taskClass,
    name: `Astra ${taskClass} certification ${index + 1}/20`,
    prompt: PROMPT_BUILDERS[taskClass](topic, index),
    criteria: CRITERIA[taskClass],
    modality: taskClass === 'vision' ? 'vision' : 'text',
  }))
}

export function getAstraCertificationBenchmarkCase(taskClass: NativeIntelligenceTaskClass, caseId: string): AstraCertificationBenchmarkCase | null {
  if (!isAstraCertificationTaskClass(taskClass)) return null
  return listAstraCertificationBenchmarkCases(taskClass).find((benchmarkCase) => benchmarkCase.caseId === caseId) ?? null
}
