import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import { ASTRA_DIVERSE_CODING_CASES, ASTRA_DIVERSE_REASONING_CASES } from './astra-certification-diverse-text-cases'
import { ASTRA_DIVERSE_AGENTIC_CASES, ASTRA_DIVERSE_GENERAL_CASES, ASTRA_DIVERSE_TOOL_USE_CASES } from './astra-certification-diverse-operational-cases'

// Preserve v1 for vision, whose deterministic PNG generator is bound to v1 case IDs.
export const ASTRA_CERTIFICATION_SUITE_VERSION = 'v1' as const
export const ASTRA_DIVERSE_TEXT_SUITE_VERSION = 'v2' as const

export function astraCertificationVersionForClass(taskClass: NativeIntelligenceTaskClass): 'v1' | 'v2' {
  return taskClass === 'vision' ? ASTRA_CERTIFICATION_SUITE_VERSION : ASTRA_DIVERSE_TEXT_SUITE_VERSION
}
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

const PROMPT_BUILDERS: Record<'reasoning' | 'coding' | 'vision', (topic: string, index: number) => string> = {
  reasoning: (topic, index) => `Reasoning benchmark ${index + 1}/20 (${topic}). Five tasks A-E have dependencies A before C, B before D, C and D before E. A takes 2 units, B 3, C 2, D 1, E 2. Two workers can run independent tasks in parallel. Determine the minimum completion time, give a valid schedule, and explain how you verified optimality.`,
  coding: (topic, index) => `Coding benchmark ${index + 1}/20 (${topic}). Design a TypeScript function that accepts an array of timestamped events, removes exact duplicates, preserves stable chronological order, rejects invalid timestamps, and returns both valid events and structured validation errors. Explain complexity and provide focused tests for edge cases.`,
  vision: (topic, index) => `Vision benchmark ${index + 1}/20 (${topic}). Inspect the supplied image carefully. Report the number of vertical coloured bars, identify the colour family of the left-most bar, state whether the small gold marker is on the left or right half, and rank the bars from shortest to tallest using their left-to-right position numbers (1, 2, 3, ...). Answer only from visible evidence and mention uncertainty if any feature is ambiguous.`,
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
  return `blackstar-astra-${taskClass}-certification-${astraCertificationVersionForClass(taskClass)}`
}

export function listAstraCertificationBenchmarkCases(taskClass: AstraCertificationTaskClass): AstraCertificationBenchmarkCase[] {
  const suiteId = astraCertificationSuiteId(taskClass)
  const version = astraCertificationVersionForClass(taskClass)
  return CASE_TOPICS.map((topic, index) => {
    // All text classes now have diverse v2 prompts. Do not silently re-sign
    // historical v1 results as v2; vision retains its v1 image oracle.
    const challenge = taskClass === 'reasoning' ? ASTRA_DIVERSE_REASONING_CASES[index]
      : taskClass === 'coding' ? ASTRA_DIVERSE_CODING_CASES[index]
      : taskClass === 'general' ? ASTRA_DIVERSE_GENERAL_CASES[index]
      : taskClass === 'tool_use' ? ASTRA_DIVERSE_TOOL_USE_CASES[index]
      : taskClass === 'agentic' ? ASTRA_DIVERSE_AGENTIC_CASES[index] : null
    const prompt = challenge
      ? `Astra ${taskClass} benchmark ${index + 1}/20 (${topic}). ${challenge} Provide your solution, assumptions, independently checkable tests or calculations, and explicitly state uncertainty where evidence is missing.`
      : PROMPT_BUILDERS.vision(topic, index)
    return {
      suiteId,
      caseId: `${version}-${String(index + 1).padStart(2, '0')}-${topic}`,
      taskClass,
      name: `Astra ${taskClass} certification ${index + 1}/20`,
      prompt,
      criteria: CRITERIA[taskClass],
      modality: taskClass === 'vision' ? 'vision' : 'text',
    }
  })
}

export function getAstraCertificationBenchmarkCase(taskClass: NativeIntelligenceTaskClass, caseId: string): AstraCertificationBenchmarkCase | null {
  if (!isAstraCertificationTaskClass(taskClass)) return null
  return listAstraCertificationBenchmarkCases(taskClass).find((benchmarkCase) => benchmarkCase.caseId === caseId) ?? null
}
