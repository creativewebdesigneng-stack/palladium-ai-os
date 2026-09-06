import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

const TASK_CLASSES = new Set<NativeIntelligenceTaskClass>([
  'general',
  'reasoning',
  'coding',
  'tool_use',
  'vision',
  'agentic',
])

const CRITERIA: Record<NativeIntelligenceTaskClass, string> = {
  general: 'correctness, helpfulness, clarity',
  reasoning: 'correctness, reasoning quality, robustness',
  coding: 'correctness, code quality, testability',
  tool_use: 'correctness, tool selection, argument quality',
  vision: 'correctness, visual grounding, detail',
  agentic: 'correctness, planning quality, execution discipline',
}

export type AstraEvaluationHandoff = {
  taskClass: NativeIntelligenceTaskClass
  provider: 'compatible'
  model: string
  runName: string
  criteria: string
}

export function parseAstraEvaluationHandoff(params: URLSearchParams): AstraEvaluationHandoff | null {
  if (params.get('source') !== 'astra-activation') return null

  const taskClass = params.get('task_class')
  const provider = params.get('provider')
  const model = params.get('model')?.trim() ?? ''

  if (!taskClass || !TASK_CLASSES.has(taskClass as NativeIntelligenceTaskClass)) return null
  if (provider !== 'compatible') return null
  if (!model || model.length > 200) return null

  const safeTaskClass = taskClass as NativeIntelligenceTaskClass
  return {
    taskClass: safeTaskClass,
    provider: 'compatible',
    model,
    runName: `Astra ${safeTaskClass.replace('_', ' ')} evaluation`,
    criteria: CRITERIA[safeTaskClass],
  }
}

export function astraEvaluationContestants(handoff: AstraEvaluationHandoff) {
  return [
    { provider: handoff.provider, model: handoff.model, label: 'Blackstar Astra' },
    { provider: 'openai', model: 'gpt-5-mini', label: 'Reference candidate' },
  ]
}
