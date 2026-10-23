import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import { isIndependentFreeLlmRouteProvider, isPinnedFreeLlmCertificationModel } from './astra-certification-judge-policy'
import { resolveFreeLlmEvaluatorConfig } from './freellm-evaluator.server'
import { hasPinnedAstraCertificationCandidate } from './astra-certification-candidate-policy'

/**
 * Safe, configuration-only readiness for the EXISTING certification runner.
 * This deliberately does not expose endpoint URLs, model IDs, env values,
 * credentials or a guessed success percentage to the client.
 */
export function inspectAstraCertificationPreflight(args: {
  taskClass: NativeIntelligenceTaskClass
  candidateModel: string
  env?: NodeJS.ProcessEnv
}) {
  const env = args.env ?? process.env
  const nativeRoute = Boolean(env['OPENAI_COMPATIBLE_BASE_URL']?.trim())
  // An external Groq bootstrap can power development, but is not proof of
  // native Astra candidate inference and must not qualify for certification.
  const candidateConfigured = hasPinnedAstraCertificationCandidate({
    taskClass: args.taskClass, candidateModel: args.candidateModel, env,
  })
  const evaluator = resolveFreeLlmEvaluatorConfig(env)
  const judgePinned = evaluator.certificationConfigured
    && isPinnedFreeLlmCertificationModel(evaluator.model)
    && isIndependentFreeLlmRouteProvider(evaluator.routedProvider)
    && isPinnedFreeLlmCertificationModel(evaluator.routedModel)
    && evaluator.routedModel !== args.candidateModel

  if (args.taskClass === 'vision') {
    const visionModelConfigured = candidateConfigured && Boolean(nativeRoute && env['BLACKSTAR_ASTRA_VISION_MODEL']?.trim())
    return {
      version: 1 as const,
      taskClass: args.taskClass,
      candidateConfigured: visionModelConfigured,
      independentJudgeConfigured: false,
      canAttemptTextCertification: false,
      state: 'vision_separate_flow' as const,
      blockers: visionModelConfigured ? [] : ['astra_vision_route_missing'],
      note: 'Vision has a separate multimodal verification workflow. This configuration check does not probe a model or establish quality.',
    }
  }

  const blockers: string[] = []
  if (!candidateConfigured) blockers.push('astra_candidate_route_missing')
  if (!judgePinned) blockers.push('pinned_independent_evaluator_missing')
  const ready = blockers.length === 0
  return {
    version: 1 as const,
    taskClass: args.taskClass,
    candidateConfigured,
    independentJudgeConfigured: Boolean(judgePinned),
    canAttemptTextCertification: ready,
    state: ready ? 'configured_unprobed' as const : 'configuration_missing' as const,
    blockers,
    note: 'Configuration-only preflight. Groq bootstrap and an unpinned compatible endpoint cannot establish native Astra certification. Endpoint availability does not establish model ownership. Real inference, credentials, evaluator independence, and signed evidence remain unproven.',
  }
}
