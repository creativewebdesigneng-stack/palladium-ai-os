export const GROQ_TASK_CLASSES = ['general','reasoning','coding','tool_use','agentic'] as const
export type GroqTaskClass = typeof GROQ_TASK_CLASSES[number]

export type GroqEvidenceSample = {
  provider: string
  model: string
  taskClass: GroqTaskClass
  score: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  toolUseObserved: boolean
  costUsd?: number | null
}

export type GroqRoutingEvidence = {
  taskClass: GroqTaskClass
  sampleCount: number
  averageScore: number | null
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  toolUseRate: number | null
  averageCostUsd: number | null
  costEvidenceAvailable: boolean
  qualified: boolean
  reasons: string[]
}

function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a,b)=>a-b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? null
}

export function summariseGroqEvidence(
  samples: GroqEvidenceSample[],
  taskClass: GroqTaskClass,
): GroqRoutingEvidence {
  const rows = samples.filter((sample) => sample.provider === 'groq' && sample.taskClass === taskClass)
  const scores = rows.map((row) => row.score).filter(Number.isFinite)
  const latencies = rows.map((row) => row.latencyMs).filter((value) => Number.isFinite(value) && value >= 0)
  const costs = rows.map((row) => row.costUsd).filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  const averageScore = scores.length ? scores.reduce((a,b)=>a+b,0) / scores.length : null
  const toolUseRate = rows.length ? rows.filter((row) => row.toolUseObserved).length / rows.length : null
  const averageCostUsd = costs.length ? costs.reduce((a,b)=>a+b,0) / costs.length : null
  const reasons: string[] = []

  // Evidence-qualified routing is deliberately conservative. A model must
  // demonstrate quality and enough samples; tool-use workloads also require
  // observed tool-use reliability. Cost never qualifies a route by itself.
  if (rows.length < 10) reasons.push('Need at least 10 same-class Groq benchmark samples.')
  if (averageScore === null || averageScore < 0.85) reasons.push('Average judged quality must be at least 0.85.')
  if (taskClass === 'tool_use' || taskClass === 'agentic') {
    if (toolUseRate === null || toolUseRate < 0.9) reasons.push('Tool-use success evidence must be at least 90%.')
  }

  return {
    taskClass,
    sampleCount: rows.length,
    averageScore,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    toolUseRate,
    averageCostUsd,
    costEvidenceAvailable: costs.length === rows.length && rows.length > 0,
    qualified: reasons.length === 0,
    reasons,
  }
}

export function shouldRouteToGroq(evidence: GroqRoutingEvidence) {
  return evidence.qualified
}

export function configuredModelCostUsd(args: {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
}) {
  const key = `MODEL_COST_USD_PER_MILLION_${args.provider}_${args.model}`
    .replace(/[^A-Za-z0-9_]/g, '_')
    .toUpperCase()
  const raw = process.env[key]
  if (!raw) return null
  const [inputRaw, outputRaw] = raw.split(',').map((value) => value?.trim())
  const inputRate = Number(inputRaw)
  const outputRate = Number(outputRaw)
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate < 0 || outputRate < 0) return null
  return (args.inputTokens / 1_000_000) * inputRate + (args.outputTokens / 1_000_000) * outputRate
}
