import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import { BLACKSTAR_ASTRA_ENGINE_PROFILE } from '@/lib/runtime/blackstar-astra-engine-profile'

/**
 * Certification lane, not the operational Astra/Groq bootstrap.
 * An API-compatible endpoint and explicit model pin are prerequisites, NOT
 * evidence that Blackstar trained or owns the weights behind that endpoint.
 * The actual model, judge and signed run still need independent verification.
 */
export function hasPinnedAstraCertificationCandidate(args: {
  taskClass: NativeIntelligenceTaskClass
  candidateModel: string
  env?: NodeJS.ProcessEnv
}): boolean {
  const env = args.env ?? process.env
  if (!env['OPENAI_COMPATIBLE_BASE_URL']?.trim()) return false
  const candidate = args.candidateModel.trim()
  if (!candidate || candidate === BLACKSTAR_ASTRA_ENGINE_PROFILE.defaultModel ||
    candidate === BLACKSTAR_ASTRA_ENGINE_PROFILE.groqBootstrapModel) return false

  const pinned = [
    env['BLACKSTAR_NATIVE_MODEL']?.trim(),
    env['BLACKSTAR_ASTRA_MODEL']?.trim(),
    args.taskClass === 'reasoning' ? env['BLACKSTAR_ASTRA_REASONING_MODEL']?.trim() : undefined,
    args.taskClass === 'coding' ? env['BLACKSTAR_ASTRA_CODING_MODEL']?.trim() : undefined,
    args.taskClass === 'tool_use' || args.taskClass === 'agentic'
      ? env['BLACKSTAR_ASTRA_AGENTIC_MODEL']?.trim() : undefined,
    args.taskClass === 'vision' ? env['BLACKSTAR_ASTRA_VISION_MODEL']?.trim() : undefined,
  ]
  return pinned.some((model) => Boolean(model) && model === candidate)
}
