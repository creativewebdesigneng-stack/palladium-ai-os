import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import { isIndependentFreeLlmRouteProvider, isPinnedFreeLlmCertificationModel } from './astra-certification-judge-policy'
import { resolveFreeLlmEvaluatorConfig } from './freellm-evaluator.server'

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
  const bootstrap = !nativeRoute && Boolean(env['GROQ_API_KEY']?.trim())
  const candidateConfigured = nativeRoute || bootstrap
  const evaluator = resolveFreeLlmEvaluatorConfig(env)
  const judgePinned = evaluator.certificationConfigured
    && isPinnedFreeLlmCertificationModel(evaluator.model)
    && isIndependentFreeLlmRouteProvider(evaluator.routedProvider)
    && isPinnedFreeLlmCertificationModel(evaluator.routedModel)
    && evaluator.routedModel !== args.candidateModel

  if (args.taskClass === 'vision') {
    const visionModelConfigured = Boolean(nativeRoute && env['BLACKSTAR_ASTRA_VISION_MODEL']?.trim())
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
    note: 'Configuration-only preflight. Actual model reachability, credential validity, returned judge route, permissions and signed run evidence must be checked by a genuine authorized certification execution.',
  }
}
