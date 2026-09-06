import {
  BLACKSTAR_ASTRA_ENGINE_PROFILE,
  blackstarAstraModelForTaskClass,
  isBlackstarAstraEngineConfigured,
} from './blackstar-astra-engine-profile'
import { probeBlackstarAstraServingReadiness } from './blackstar-astra-serving-readiness.server'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

const ASTRA_TASK_CLASSES: NativeIntelligenceTaskClass[] = [
  'general',
  'reasoning',
  'coding',
  'tool_use',
  'agentic',
]

type Sb = { from: (table: string) => any }

export type BlackstarAstraRuntimeReadiness = {
  version: 1
  engine_id: string
  configured: boolean
  models: Array<{
    task_classes: NativeIntelligenceTaskClass[]
    model: string
    serving_ready: boolean
    serving_reason: string
    checked_at: string
  }>
  evidence_store_available: boolean
  routing_infrastructure_ready: boolean
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

async function evidenceStoreAvailable(sb: Sb): Promise<boolean> {
  try {
    const { error } = await sb
      .from('model_eval_verified_evidence')
      .select('id')
      .limit(1)
    return !error
  } catch {
    return false
  }
}

/**
 * Returns only safe operational readiness metadata for the Astra-class engine.
 * Endpoint URLs, API keys, raw certificates and benchmark contents are never
 * returned. This status is informational only and creates no routing authority.
 */
export async function resolveBlackstarAstraRuntimeReadiness(args: {
  sb: Sb
  probeServing?: typeof probeBlackstarAstraServingReadiness
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
          checked_at: new Date().toISOString(),
        }
    return {
      task_classes,
      model,
      serving_ready: serving.ready,
      serving_reason: serving.reason,
      checked_at: serving.checked_at,
    }
  }))
  const evidence_store_available = await evidenceStoreAvailable(args.sb)
  const servingReady = configured && models.length > 0 && models.every((model) => model.serving_ready)

  return {
    version: 1,
    engine_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    configured,
    models,
    evidence_store_available,
    routing_infrastructure_ready: servingReady && evidence_store_available,
    certification_note:
      'Routing infrastructure readiness does not mean a model is certified. Each task class and exact provider/model identity still requires fresh verifier-owned Model Arena evidence before Astra can win routing.',
    authority_note:
      'Readiness is operational metadata only. It grants no tools, approvals, permissions, identity, delegation, verification bypass or execution authority.',
  }
}
