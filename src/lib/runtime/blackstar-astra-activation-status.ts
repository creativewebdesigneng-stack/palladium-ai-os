export type AstraActivationReadiness = {
  configured: boolean
  evidence_store_available: boolean
  routing_infrastructure_ready: boolean
  models: Array<{
    task_classes: string[]
    model: string
    serving_ready: boolean
    serving_reason: string
    checked_at: string
  }>
}

export type AstraActivationStage = {
  id: 'configured' | 'serving' | 'evidence' | 'routing'
  label: string
  ready: boolean
  detail: string
}

export type AstraActivationSummary = {
  state: 'not_configured' | 'serving_unready' | 'evidence_unavailable' | 'routing_ready'
  label: string
  stages: AstraActivationStage[]
  all_models_serving: boolean
  certification_required: true
}

/**
 * Converts the server-sanitized Astra readiness contract into UI state.
 * This deliberately never infers certification from configuration or health:
 * exact verifier-owned evidence is still checked by the routing layer per run.
 */
export function deriveAstraActivationSummary(
  readiness: AstraActivationReadiness | null | undefined,
): AstraActivationSummary | null {
  if (!readiness) return null

  const allModelsServing = readiness.models.length > 0 && readiness.models.every((model) => model.serving_ready)
  const stages: AstraActivationStage[] = [
    {
      id: 'configured',
      label: 'Configured',
      ready: readiness.configured,
      detail: readiness.configured
        ? 'Blackstar has an Astra-compatible serving identity configured.'
        : 'A Blackstar-controlled Astra serving identity is not configured on this deployment.',
    },
    {
      id: 'serving',
      label: 'Serving',
      ready: readiness.configured && allModelsServing,
      detail: allModelsServing
        ? 'Every configured Astra model passed the bounded server-side readiness probe.'
        : 'One or more configured Astra models are not currently serving.',
    },
    {
      id: 'evidence',
      label: 'Evaluation store',
      ready: readiness.evidence_store_available,
      detail: readiness.evidence_store_available
        ? 'The verifier-owned evaluation evidence store is available.'
        : 'The verifier-owned evaluation evidence store is unavailable on this database.',
    },
    {
      id: 'routing',
      label: 'Routing infrastructure',
      ready: readiness.routing_infrastructure_ready,
      detail: readiness.routing_infrastructure_ready
        ? 'Infrastructure is ready for evidence-gated routing decisions.'
        : 'Astra cannot be considered routing-ready until serving and evaluation infrastructure are both ready.',
    },
  ]

  let state: AstraActivationSummary['state'] = 'routing_ready'
  let label = 'Infrastructure ready — certification still required per route'
  if (!readiness.configured) {
    state = 'not_configured'
    label = 'Not configured'
  } else if (!allModelsServing) {
    state = 'serving_unready'
    label = 'Configured, serving not ready'
  } else if (!readiness.evidence_store_available) {
    state = 'evidence_unavailable'
    label = 'Serving ready, evaluation store unavailable'
  }

  return {
    state,
    label,
    stages,
    all_models_serving: allModelsServing,
    certification_required: true,
  }
}
