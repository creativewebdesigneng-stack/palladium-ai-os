import type { Provider } from '@/lib/runtime/model-gateway.base'

export const NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES = 20
export const NATIVE_INTELLIGENCE_MAX_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1000

export type NativeIntelligenceTaskClass =
  | 'general'
  | 'reasoning'
  | 'coding'
  | 'tool_use'
  | 'vision'
  | 'agentic'

export type NativeIntelligenceCapability =
  | 'text'
  | 'reasoning'
  | 'coding'
  | 'tools'
  | 'vision'
  | 'structured_output'

export type NativeIntelligenceModelDescriptor = {
  id: string
  provider: Provider
  model: string
  ownership: 'blackstar' | 'external'
  lifecycle: 'candidate' | 'production' | 'disabled'
  capabilities: readonly NativeIntelligenceCapability[]
  context_window: number
  streaming: boolean
  latency_class: 'low' | 'standard' | 'high'
  cost_class: 'low' | 'standard' | 'high'
}

export type NativeIntelligenceEvaluationEvidence = {
  model_id: string
  suite_id: string
  task_class: NativeIntelligenceTaskClass
  score: number
  sample_count: number
  verified: boolean
  completed_at: string
}

export type NativeIntelligenceRoutingRequest = {
  task_class: NativeIntelligenceTaskClass
  required_capabilities?: readonly NativeIntelligenceCapability[]
  min_context_window?: number
  fallback_model_id?: string
  now?: string
  max_evidence_age_ms?: number
}

export type NativeIntelligenceRoutingDecision = {
  model_id: string
  provider: Provider
  model: string
  ownership: 'blackstar' | 'external'
  source: 'verified_evaluation' | 'explicit_fallback'
  evaluation_score: number | null
  evaluation_samples: number
}

type QualifiedScore = {
  score: number
  samples: number
}

const cleanId = (value: string) => value.trim().slice(0, 200)

export function isValidNativeIntelligenceModelDescriptor(
  descriptor: NativeIntelligenceModelDescriptor,
): boolean {
  if (!cleanId(descriptor.id) || !cleanId(descriptor.model)) return false
  if (!Number.isInteger(descriptor.context_window) || descriptor.context_window <= 0) return false
  if (!descriptor.capabilities.includes('text')) return false
  return descriptor.capabilities.every((capability, index) =>
    descriptor.capabilities.indexOf(capability) === index,
  )
}

function eligibleModel(
  descriptor: NativeIntelligenceModelDescriptor,
  request: NativeIntelligenceRoutingRequest,
): boolean {
  if (descriptor.lifecycle === 'disabled') return false
  if (!isValidNativeIntelligenceModelDescriptor(descriptor)) return false
  const minimumContext = Math.max(0, request.min_context_window ?? 0)
  if (descriptor.context_window < minimumContext) return false
  const required = new Set(request.required_capabilities ?? [])
  if (request.task_class === 'reasoning') required.add('reasoning')
  if (request.task_class === 'coding') required.add('coding')
  if (request.task_class === 'tool_use' || request.task_class === 'agentic') required.add('tools')
  if (request.task_class === 'vision') required.add('vision')
  return [...required].every((capability) => descriptor.capabilities.includes(capability))
}

function qualifiedEvidenceScore(
  modelId: string,
  taskClass: NativeIntelligenceTaskClass,
  evidence: readonly NativeIntelligenceEvaluationEvidence[],
  request: NativeIntelligenceRoutingRequest,
): QualifiedScore | null {
  const now = Date.parse(request.now ?? new Date().toISOString())
  if (!Number.isFinite(now)) return null
  const maxAge = Math.max(0, request.max_evidence_age_ms ?? NATIVE_INTELLIGENCE_MAX_EVIDENCE_AGE_MS)
  const rows = evidence.filter((row) => {
    const completedAt = Date.parse(row.completed_at)
    return row.model_id === modelId &&
      row.task_class === taskClass &&
      row.verified &&
      Number.isFinite(row.score) &&
      row.score >= 0 &&
      row.score <= 1 &&
      Number.isInteger(row.sample_count) &&
      row.sample_count >= NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES &&
      Number.isFinite(completedAt) &&
      completedAt <= now &&
      now - completedAt <= maxAge
  })
  if (!rows.length) return null

  const samples = rows.reduce((sum, row) => sum + row.sample_count, 0)
  if (!samples) return null
  const weighted = rows.reduce((sum, row) => sum + row.score * row.sample_count, 0) / samples
  return { score: weighted, samples }
}

/**
 * Evidence-qualified model routing for Blackstar Native Intelligence.
 *
 * This function can select a Blackstar-owned model or an external model, but it
 * does not grant tools, approvals, capabilities, identities, delegation rights,
 * or execution authority. A model only wins automatically when reproducible,
 * verified and sufficiently recent evaluation evidence exists for the requested
 * task class. Without qualified evidence the caller must provide an explicit
 * fallback model.
 */
export function selectNativeIntelligenceModel(args: {
  models: readonly NativeIntelligenceModelDescriptor[]
  evidence: readonly NativeIntelligenceEvaluationEvidence[]
  request: NativeIntelligenceRoutingRequest
}): NativeIntelligenceRoutingDecision | null {
  const eligible = args.models.filter((model) => eligibleModel(model, args.request))
  const scored = eligible
    .map((descriptor) => ({
      descriptor,
      evaluation: qualifiedEvidenceScore(descriptor.id, args.request.task_class, args.evidence, args.request),
    }))
    .filter((row): row is { descriptor: NativeIntelligenceModelDescriptor; evaluation: QualifiedScore } =>
      row.evaluation !== null,
    )
    .sort((a, b) =>
      b.evaluation.score - a.evaluation.score ||
      b.evaluation.samples - a.evaluation.samples ||
      a.descriptor.id.localeCompare(b.descriptor.id),
    )

  const winner = scored[0]
  if (winner) {
    return {
      model_id: winner.descriptor.id,
      provider: winner.descriptor.provider,
      model: winner.descriptor.model,
      ownership: winner.descriptor.ownership,
      source: 'verified_evaluation',
      evaluation_score: winner.evaluation.score,
      evaluation_samples: winner.evaluation.samples,
    }
  }

  const fallbackId = cleanId(args.request.fallback_model_id ?? '')
  const fallback = fallbackId
    ? eligible.find((descriptor) => descriptor.id === fallbackId)
    : undefined
  if (!fallback) return null

  return {
    model_id: fallback.id,
    provider: fallback.provider,
    model: fallback.model,
    ownership: fallback.ownership,
    source: 'explicit_fallback',
    evaluation_score: null,
    evaluation_samples: 0,
  }
}
