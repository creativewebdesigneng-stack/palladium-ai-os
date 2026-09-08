import {
  ASTRA_CERTIFICATION_JUDGES,
  isPinnedFreeLlmCertificationModel,
  type AstraCertificationJudge,
} from './astra-certification-judge-policy'
import { resolveFreeLlmEvaluatorConfig } from './freellm-evaluator.server'

export type ServerAstraCertificationJudge = AstraCertificationJudge | {
  provider: 'freellm'
  model: string
  label: string
}

export function listServerApprovedAstraCertificationJudges(): readonly ServerAstraCertificationJudge[] {
  const config = resolveFreeLlmEvaluatorConfig()
  if (!config.configured || !isPinnedFreeLlmCertificationModel(config.model)) return ASTRA_CERTIFICATION_JUDGES
  return [
    ...ASTRA_CERTIFICATION_JUDGES,
    { provider: 'freellm' as const, model: config.model, label: `FreeLLMAPI · ${config.model}` },
  ]
}

export function isServerApprovedAstraCertificationJudge(provider: unknown, model: unknown): boolean {
  if (typeof provider !== 'string' || typeof model !== 'string') return false
  const cleanProvider = provider.trim()
  const cleanModel = model.trim()
  return listServerApprovedAstraCertificationJudges().some((judge) =>
    judge.provider === cleanProvider && judge.model === cleanModel,
  )
}
