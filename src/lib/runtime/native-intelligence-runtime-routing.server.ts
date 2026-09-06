import {
  mapNativeIntelligenceEvaluationEvidence,
  NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT,
} from '@/lib/ai/native-intelligence-evaluation-evidence'
import {
  selectNativeIntelligenceModel,
  type NativeIntelligenceCapability,
  type NativeIntelligenceModelDescriptor,
  type NativeIntelligenceRoutingDecision,
  type NativeIntelligenceTaskClass,
} from '@/lib/ai/native-intelligence-model-platform'
import type { Agent, PreparedRun } from './runtime.server'
import { blackstarNativeModelDescriptor } from './blackstar-native-inference-profile'
import {
  blackstarAstraModelDescriptor,
  isBlackstarAstraEngineConfigured,
} from './blackstar-astra-engine-profile'

const TASK_CLASSES = new Set<NativeIntelligenceTaskClass>([
  'general',
  'reasoning',
  'coding',
  'tool_use',
  'vision',
  'agentic',
])

const PROVIDER_MODEL_IDS: Record<string, string> = {
  lovable: 'agent-configured-lovable',
  gemini: 'agent-configured-gemini',
  openai: 'agent-configured-openai',
  anthropic: 'agent-configured-anthropic',
  groq: 'agent-configured-groq',
  deepseek: 'agent-configured-deepseek',
  compatible: 'agent-configured-compatible',
}

type Sb = { from: (table: string) => any }

export type NativeIntelligenceRuntimeRouting = {
  provider: PreparedRun['provider']
  model: string
  decision: NativeIntelligenceRoutingDecision | null
}

function taskClassForAgent(agent: Agent): NativeIntelligenceTaskClass {
  const raw = String(agent.category ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  if (TASK_CLASSES.has(raw as NativeIntelligenceTaskClass)) return raw as NativeIntelligenceTaskClass
  if (/\b(code|coding|developer|development|software|engineering)\b/.test(raw)) return 'coding'
  if (/\b(tool|integration|automation)\b/.test(raw)) return 'tool_use'
  if (/\b(vision|image|video|multimodal|creative)\b/.test(raw)) return 'vision'
  if (/\b(agent|autonomous|operations|workflow)\b/.test(raw)) return 'agentic'
  if (/\b(reason|analysis|research|strategy|planning)\b/.test(raw)) return 'reasoning'
  return 'general'
}

function capabilitiesForRun(run: PreparedRun, taskClass: NativeIntelligenceTaskClass): NativeIntelligenceCapability[] {
  const capabilities = new Set<NativeIntelligenceCapability>(['text'])
  if (taskClass === 'reasoning') capabilities.add('reasoning')
  if (taskClass === 'coding') capabilities.add('coding')
  if (taskClass === 'tool_use' || taskClass === 'agentic' || run.tools.grants.size > 0) capabilities.add('tools')
  if (taskClass === 'vision') capabilities.add('vision')
  return [...capabilities]
}

function configuredDescriptor(run: PreparedRun): NativeIntelligenceModelDescriptor {
  const id = PROVIDER_MODEL_IDS[run.provider] ?? `agent-configured-${run.provider}`
  return {
    id,
    provider: run.provider,
    model: run.model,
    ownership: run.provider === 'compatible' && run.model === blackstarNativeModelDescriptor().model ? 'blackstar' : 'external',
    lifecycle: 'production',
    capabilities: ['text', 'reasoning', 'coding', 'tools', 'structured_output'],
    context_window: 128_000,
    streaming: true,
    latency_class: 'standard',
    cost_class: 'standard',
  }
}

function pushDistinctModel(
  models: NativeIntelligenceModelDescriptor[],
  descriptor: NativeIntelligenceModelDescriptor,
): void {
  if (models.some((model) =>
    model.id === descriptor.id ||
    (model.provider === descriptor.provider && model.model === descriptor.model),
  )) return
  models.push(descriptor)
}

/**
 * Persist the actual model transport selected for an already-created task row.
 * This updates provenance only. Routing evidence and authority metadata are not
 * stored on the task and this helper cannot change tools, approvals or identity.
 */
export async function persistNativeIntelligenceRuntimeRouting(args: {
  sb: Sb
  taskId: string
  routing: Pick<NativeIntelligenceRuntimeRouting, 'provider' | 'model'>
}): Promise<void> {
  const { error } = await args.sb
    .from('agent_tasks')
    .update({ provider: args.routing.provider, model: args.routing.model })
    .eq('id', args.taskId)
  if (error) {
    console.error('[runtime.native-intelligence] could not persist routed model provenance', error)
  }
}

/**
 * Resolve a model for an already-authorised agent run using verifier-owned
 * Native Intelligence evidence. The existing agent-selected provider/model is
 * always an explicit fallback and remains the only route when evidence is
 * absent, malformed, inaccessible, or a Blackstar-native endpoint is not
 * configured.
 *
 * Blackstar Astra-class is a candidate intelligence engine, not an authority
 * source. It can only win routing through exact, fresh, verified evaluation
 * evidence for its bound provider/model identity.
 *
 * This function never changes the run's tools, approvals, identity, agent,
 * organisation, delegation, or execution permissions.
 */
export async function resolveNativeIntelligenceRuntimeRouting(args: {
  sb: Sb
  userId: string
  run: PreparedRun
}): Promise<NativeIntelligenceRuntimeRouting> {
  const fallback = configuredDescriptor(args.run)
  const taskClass = taskClassForAgent(args.run.agent)
  const models: NativeIntelligenceModelDescriptor[] = [fallback]

  const native = blackstarNativeModelDescriptor()
  const nativeConfigured = Boolean(process.env['OPENAI_COMPATIBLE_BASE_URL']?.trim())
  if (nativeConfigured) pushDistinctModel(models, native)

  if (isBlackstarAstraEngineConfigured()) {
    pushDistinctModel(models, blackstarAstraModelDescriptor())
  }

  let evidence: ReturnType<typeof mapNativeIntelligenceEvaluationEvidence> = []
  try {
    let query = args.sb
      .from('model_eval_verified_evidence')
      .select(NATIVE_INTELLIGENCE_VERIFIED_EVIDENCE_SELECT)
      .eq('task_class', taskClass)
      .in('model_id', models.map((model) => model.id))
      .order('verified_at', { ascending: false })
      .limit(100)

    query = args.run.orgId === null
      ? query.eq('user_id', args.userId).is('organization_id', null)
      : query.eq('organization_id', args.run.orgId)

    const { data, error } = await query
    if (error) throw error
    evidence = mapNativeIntelligenceEvaluationEvidence(data ?? [])
  } catch (error) {
    console.error('[runtime.native-intelligence] verified evaluation evidence load failed', error)
  }

  const decision = selectNativeIntelligenceModel({
    models,
    evidence,
    request: {
      task_class: taskClass,
      required_capabilities: capabilitiesForRun(args.run, taskClass),
      fallback_model_id: fallback.id,
    },
  })

  if (!decision) {
    return { provider: args.run.provider, model: args.run.model, decision: null }
  }

  return {
    provider: decision.provider,
    model: decision.model,
    decision,
  }
}
