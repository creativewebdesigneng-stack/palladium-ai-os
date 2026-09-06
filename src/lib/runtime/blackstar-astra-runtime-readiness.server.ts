import {
  BLACKSTAR_ASTRA_ENGINE_PROFILE,
  blackstarAstraModelDescriptorForTaskClass,
  blackstarAstraModelForTaskClass,
  isBlackstarAstraEngineConfigured,
} from './blackstar-astra-engine-profile'
import { probeBlackstarAstraServingReadiness } from './blackstar-astra-serving-readiness.server'
import type { BlackstarAstraServingHealth } from './blackstar-astra-serving-readiness.server'
import {
  mapNativeIntelligenceEvaluationEvidence,
  NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT,
} from '@/lib/ai/native-intelligence-evaluation-evidence'
import {
  selectNativeIntelligenceModel,
  type NativeIntelligenceTaskClass,
} from '@/lib/ai/native-intelligence-model-platform'

const ASTRA_TASK_CLASSES: NativeIntelligenceTaskClass[] = [
  'general',
  'reasoning',
  'coding',
  'tool_use',
  'agentic',
]

type Sb = { from: (table: string) => any }

export type BlackstarAstraTaskCertification = {
  task_class: NativeIntelligenceTaskClass
  model: string
  evidence_available: boolean
  certified_eligible: boolean
  actually_routable: boolean
  evaluation_score: number | null
  evaluation_samples: number
  evidence_completed_at: string | null
}

export type BlackstarAstraRuntimeReadiness = {
  version: 2
  engine_id: string
  configured: boolean
  models: Array<{
    task_classes: NativeIntelligenceTaskClass[]
    model: string
    serving_ready: boolean
    serving_reason: string
    serving_health: BlackstarAstraServingHealth
    latency_ms: number | null
    checked_at: string
  }>
  evidence_store_available: boolean
  routing_infrastructure_ready: boolean
  certification: BlackstarAstraTaskCertification[]
  certified_task_classes: number
  routable_task_classes: number
  certification_note: string
  authority_note: string
}

function configuredModels(): Array<{ model: string; task_classes: NativeIntelligenceTaskClass[] }> {
  const byModel = new Map<string, NativeIntelligenceTaskClass[]>()
  for (const taskClass of ASTRA_TASK_CLASSES) {
    const model = blackstarAstraModelForTaskClass(taskClass)
    const classes = byModel.get(model) ?? []
    classes.push(taskClass)
    byModel.set(model, classes)
  }
  return [...byModel.entries()].map(([model, task_classes]) => ({ model, task_classes }))
}

async function loadVerifiedEvidence(sb: Sb): Promise<{
  available: boolean
  rows: ReturnType<typeof mapNativeIntelligenceEvaluationEvidence>
}> {
  try {
    const { data, error } = await sb
      .from('model_eval_verified_evidence')
      .select(NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT)
      .eq('model_id', BLACKSTAR_ASTRA_ENGINE_PROFILE.id)
      .eq('provider', BLACKSTAR_ASTRA_ENGINE_PROFILE.palladiumProvider)
      .in('task_class', ASTRA_TASK_CLASSES)
      .order('completed_at', { ascending: false })
      .limit(500)
    if (error) return { available: false, rows: [] }
    return { available: true, rows: mapNativeIntelligenceEvaluationEvidence(data ?? []) }
  } catch {
    return { available: false, rows: [] }
  }
}

function servingReadyForTask(
  models: BlackstarAstraRuntimeReadiness['models'],
  taskClass: NativeIntelligenceTaskClass,
): boolean {
  return models.some((model) => model.task_classes.includes(taskClass) && model.serving_ready)
}

function certificationForTask(args: {
  taskClass: NativeIntelligenceTaskClass
  evidence: ReturnType<typeof mapNativeIntelligenceEvaluationEvidence>
  models: BlackstarAstraRuntimeReadiness['models']
  configured: boolean
  now: string
}): BlackstarAstraTaskCertification {
  const descriptor = blackstarAstraModelDescriptorForTaskClass(args.taskClass)
  const exactEvidence = args.evidence
    .filter((row) =>
      row.model_id === descriptor.id &&
      row.provider === descriptor.provider &&
      row.model === descriptor.model &&
      row.task_class === args.taskClass,
    )
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))

  const decision = selectNativeIntelligenceModel({
    models: [descriptor],
    evidence: args.evidence,
    request: {
      task_class: args.taskClass,
      now: args.now,
    },
  })
  const certifiedEligible = decision?.source === 'verified_evaluation' && decision.model_id === descriptor.id
  const latestEvidence = exactEvidence[0]

  return {
    task_class: args.taskClass,
    model: descriptor.model,
    evidence_available: exactEvidence.length > 0,
    certified_eligible: certifiedEligible,
    actually_routable: Boolean(
      args.configured &&
      servingReadyForTask(args.models, args.taskClass) &&
      certifiedEligible,
    ),
    evaluation_score: certifiedEligible ? decision.evaluation_score : null,
    evaluation_samples: certifiedEligible ? decision.evaluation_samples : 0,
    evidence_completed_at: latestEvidence?.completed_at ?? null,
  }
}

/**
 * Returns only safe operational and verifier-backed activation metadata for the
 * Astra-class engine. Endpoint URLs, credentials, raw certificates, benchmark
 * prompts/responses and judge reasoning are never returned.
 *
 * Certification is not a mutable admin flag. It is derived through the exact
 * Native Intelligence selector that already gates runtime routing on fresh,
 * verifier-owned evidence for the exact model identity and task class.
 */
export async function resolveBlackstarAstraRuntimeReadiness(args: {
  sb: Sb
  probeServing?: typeof probeBlackstarAstraServingReadiness
  now?: string
}): Promise<BlackstarAstraRuntimeReadiness> {
  const configured = isBlackstarAstraEngineConfigured()
  const probeServing = args.probeServing ?? probeBlackstarAstraServingReadiness
  const modelGroups = configuredModels()
  const models = await Promise.all(modelGroups.map(async ({ model, task_classes }) => {
    const serving = configured
      ? await probeServing({ model })
      : {
          ready: false,
          reason: 'not_configured' as const,
          health: 'unavailable' as const,
          latency_ms: null,
          checked_at: new Date().toISOString(),
        }
    return {
      task_classes,
      model,
      serving_ready: serving.ready,
      serving_reason: serving.reason,
      serving_health: serving.health,
      latency_ms: serving.latency_ms,
      checked_at: serving.checked_at,
    }
  }))

  const evidence = await loadVerifiedEvidence(args.sb)
  const servingReady = configured && models.length > 0 && models.every((model) => model.serving_ready)
  const now = args.now ?? new Date().toISOString()
  const certification = ASTRA_TASK_CLASSES.map((taskClass) => certificationForTask({
    taskClass,
    evidence: evidence.rows,
    models,
    configured,
    now,
  }))

  return {
    version: 2,
    engine_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    configured,
    models,
    evidence_store_available: evidence.available,
    routing_infrastructure_ready: servingReady && evidence.available,
    certification,
    certified_task_classes: certification.filter((item) => item.certified_eligible).length,
    routable_task_classes: certification.filter((item) => item.actually_routable).length,
    certification_note:
      'Certified/eligible means Blackstar\'s existing evidence-gated Native Intelligence selector found fresh verifier-owned evidence for the exact Astra engine ID, provider/model identity and task class. Evidence presence alone is not certification.',
    authority_note:
      'Readiness, evidence and certification metadata are informational only and grants no tools, approvals, permissions, identity, delegation, verification bypass or execution authority.',
  }
}
