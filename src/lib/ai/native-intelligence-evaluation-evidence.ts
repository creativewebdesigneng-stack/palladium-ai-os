import {
  NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES,
  type NativeIntelligenceEvaluationEvidence,
  type NativeIntelligenceTaskClass,
} from './native-intelligence-model-platform'
import { normaliseProvider } from '@/lib/runtime/model-gateway.base'

export const NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT = [
  'model_id',
  'provider',
  'model',
  'suite_id',
  'task_class',
  'score',
  'sample_count',
  'benchmark_hash',
  'evaluator_hash',
  'model_config_hash',
  'completed_at',
  'verified_at',
].join(',')

const TASK_CLASSES = new Set<NativeIntelligenceTaskClass>([
  'general',
  'reasoning',
  'coding',
  'tool_use',
  'vision',
  'agentic',
])

const SHA256_HEX = /^[a-f0-9]{64}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanIdentifier(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned && cleaned.length <= 200 ? cleaned : null
}

function finiteScore(value: unknown): number | null {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : null
}

function validIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value))
}

/**
 * Converts a verifier-controlled Evaluation Lab certificate into the narrow
 * evidence contract consumed by Native Intelligence routing.
 *
 * Exact provider/model identity remains in the routing contract so evidence
 * cannot be replayed after a stable model ID is pointed at a different serving
 * target. Reproducibility hashes are mandatory at this boundary but deliberately
 * discarded after validation. Raw Arena prompts/responses/judge reasoning and
 * execution-authority metadata are not part of this contract.
 */
export function toNativeIntelligenceEvaluationEvidence(
  row: unknown,
): NativeIntelligenceEvaluationEvidence | null {
  if (!isRecord(row)) return null

  const modelId = cleanIdentifier(row['model_id'])
  const providerId = cleanIdentifier(row['provider'])
  const model = cleanIdentifier(row['model'])
  const suiteId = cleanIdentifier(row['suite_id'])
  const taskClass = row['task_class']
  const score = finiteScore(row['score'])
  const sampleCount = row['sample_count']
  const completedAt = row['completed_at']
  const verifiedAt = row['verified_at']

  if (!modelId || !providerId || !model || !suiteId) return null
  const provider = normaliseProvider(providerId)
  if (providerId.toLowerCase() !== provider) return null
  if (typeof taskClass !== 'string' || !TASK_CLASSES.has(taskClass as NativeIntelligenceTaskClass)) return null
  if (score === null) return null
  if (!Number.isInteger(sampleCount) || (sampleCount as number) < NATIVE_INTELLIGENCE_MIN_EVAL_SAMPLES) return null
  if (typeof row['benchmark_hash'] !== 'string' || !SHA256_HEX.test(row['benchmark_hash'])) return null
  if (typeof row['evaluator_hash'] !== 'string' || !SHA256_HEX.test(row['evaluator_hash'])) return null
  if (typeof row['model_config_hash'] !== 'string' || !SHA256_HEX.test(row['model_config_hash'])) return null
  if (!validIsoTimestamp(completedAt) || !validIsoTimestamp(verifiedAt)) return null
  if (Date.parse(verifiedAt) < Date.parse(completedAt)) return null

  return {
    model_id: modelId,
    provider,
    model,
    suite_id: suiteId,
    task_class: taskClass as NativeIntelligenceTaskClass,
    score,
    sample_count: sampleCount as number,
    verified: true,
    completed_at: completedAt,
  }
}

export function mapNativeIntelligenceEvaluationEvidence(
  rows: readonly unknown[],
): NativeIntelligenceEvaluationEvidence[] {
  return rows.flatMap((row) => {
    const evidence = toNativeIntelligenceEvaluationEvidence(row)
    return evidence ? [evidence] : []
  })
}
