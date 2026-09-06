export type AstraActivationReadiness = {
  configured: boolean
  evidence_store_available: boolean
  routing_infrastructure_ready: boolean
  certified_task_classes?: number
  routable_task_classes?: number
  certification?: Array<{
    task_class: string
    model: string
    evidence_available: boolean
    certified_eligible: boolean
    actually_routable: boolean
    evaluation_score: number | null
    evaluation_samples: number
    evidence_completed_at: string | null
  }>
  models: Array<{
    task_classes: string[]
    model: string
    serving_ready: boolean
    serving_reason: string
    checked_at: string
  }>
}

export type AstraActivationStage = {
  id: 'configured' | 'serving' | 'evidence' | 'certification' | 'routing'
  label: string
  ready: boolean
  detail: string
}

export type AstraActivationSummary = {
  state:
    | 'not_configured'
    | 'serving_unready'
    | 'evidence_unavailable'
    | 'evidence_missing'
    | 'certification_partial'
    | 'routing_ready'
  label: string
  stages: AstraActivationStage[]
  all_models_serving: boolean
  certification_required: true
}

/**
 * Converts the server-sanitized Astra readiness contract into UI state.
 * Certification/routability are accepted only when the server has already
 * derived them from Blackstar's verifier-owned evidence selector.
 */
export function deriveAstraActivationSummary(
  readiness: AstraActivationReadiness | null | undefined,
): AstraActivationSummary | null {
  if (!readiness) return null

  const allModelsServing = readiness.models.length > 0 && readiness.models.every((model) => model.serving_ready)
  const certifications = readiness.certification ?? []
  const expectedTaskClasses = certifications.length
  const evidenceTaskClasses = certifications.filter((item) => item.evidence_available).length
  const certifiedTaskClasses = readiness.certified_task_classes ?? certifications.filter((item) => item.certified_eligible).length
  const routableTaskClasses = readiness.routable_task_classes ?? certifications.filter((item) => item.actually_routable).length
  const allCertified = expectedTaskClasses > 0 && certifiedTaskClasses === expectedTaskClasses
  const allRoutable = expectedTaskClasses > 0 && routableTaskClasses === expectedTaskClasses

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
      label: 'Evidence available',
      ready: readiness.evidence_store_available && evidenceTaskClasses > 0,
      detail: !readiness.evidence_store_available
        ? 'The verifier-owned evaluation evidence store is unavailable on this database.'
        : evidenceTaskClasses > 0
          ? `Verifier-owned evidence exists for ${evidenceTaskClasses}/${expectedTaskClasses || 0} Astra task classes.`
          : 'The evidence store is reachable, but no exact Astra evaluation evidence is available.',
    },
    {
      id: 'certification',
      label: 'Certified / eligible',
      ready: allCertified,
      detail: allCertified
        ? `Fresh qualified verifier evidence makes all ${certifiedTaskClasses} Astra task classes eligible.`
        : `${certifiedTaskClasses}/${expectedTaskClasses || 0} Astra task classes currently satisfy the existing evidence-gated selector.`,
    },
    {
      id: 'routing',
      label: 'Actually routable',
      ready: allRoutable,
      detail: allRoutable
        ? `All ${routableTaskClasses} Astra task classes are configured, serving and verifier-qualified for runtime routing.`
        : `${routableTaskClasses}/${expectedTaskClasses || 0} Astra task classes are currently both serving and verifier-qualified.`,
    },
  ]

  let state: AstraActivationSummary['state'] = 'routing_ready'
  let label = 'Certified and routable across Astra task classes'
  if (!readiness.configured) {
    state = 'not_configured'
    label = 'Not configured'
  } else if (!allModelsServing) {
    state = 'serving_unready'
    label = 'Configured, serving not ready'
  } else if (!readiness.evidence_store_available) {
    state = 'evidence_unavailable'
    label = 'Serving ready, evidence store unavailable'
  } else if (!evidenceTaskClasses) {
    state = 'evidence_missing'
    label = 'Serving ready, certification evidence missing'
  } else if (!allRoutable) {
    state = 'certification_partial'
    label = `${routableTaskClasses}/${expectedTaskClasses || 0} task classes routable`
  }

  return {
    state,
    label,
    stages,
    all_models_serving: allModelsServing,
    certification_required: true,
  }
}
