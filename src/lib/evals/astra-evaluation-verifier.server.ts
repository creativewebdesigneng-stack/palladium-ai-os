import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import {
  BLACKSTAR_ASTRA_ENGINE_PROFILE,
  blackstarAstraModelForTaskClass,
  isBlackstarAstraEngineConfigured,
} from '@/lib/runtime/blackstar-astra-engine-profile'

type Scope = {
  userId: string
  orgId?: string | null
  taskClass: NativeIntelligenceTaskClass
}

type ArenaRun = {
  id: string
  user_id: string
  org_id: string | null
  prompt: string
  judge_provider: string | null
  judge_model: string | null
  metadata: Record<string, unknown> | null
  completed_at: string | null
}

const MIN_RUNS = 20
const MAX_RUNS = 100
const VERIFIER_ID = 'blackstar-native-intelligence-verifier-v1'

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function astraMetadata(run: ArenaRun) {
  const value = run.metadata?.['astra_activation']
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

async function matchingRuns(scope: Scope) {
  if (!isBlackstarAstraEngineConfigured()) {
    throw new Error('Blackstar Astra serving is not configured on this deployment.')
  }

  const model = blackstarAstraModelForTaskClass(scope.taskClass)
  let query = supabaseAdmin
    .from('model_eval_runs')
    .select('id,user_id,org_id,prompt,judge_provider,judge_model,metadata,completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(MAX_RUNS)

  query = scope.orgId
    ? query.eq('org_id', scope.orgId)
    : query.is('org_id', null).eq('user_id', scope.userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const tagged = ((data ?? []) as ArenaRun[]).filter((run) => {
    const metadata = astraMetadata(run)
    return metadata?.['server_verified'] === true
      && metadata?.['task_class'] === scope.taskClass
      && metadata?.['provider'] === 'compatible'
      && metadata?.['model'] === model
  })

  if (!tagged.length) return { model, runs: [] as ArenaRun[] }

  const runIds = tagged.map((run) => run.id)
  const { data: responses, error: responseError } = await supabaseAdmin
    .from('model_eval_responses')
    .select('run_id')
    .in('run_id', runIds)
    .eq('provider', 'compatible')
    .eq('model', model)
  if (responseError) throw new Error(responseError.message)

  const exactRunIds = new Set((responses ?? []).map((row) => row.run_id as string))
  return { model, runs: tagged.filter((run) => exactRunIds.has(run.id)) }
}

export async function getAstraEvaluationCertificationStatus(scope: Scope) {
  const { model, runs } = await matchingRuns(scope)
  return {
    taskClass: scope.taskClass,
    provider: 'compatible' as const,
    model,
    completedRuns: runs.length,
    minimumRuns: MIN_RUNS,
    readyToCertify: runs.length >= MIN_RUNS,
  }
}

export async function certifyAstraEvaluation(scope: Scope) {
  const { model, runs } = await matchingRuns(scope)
  if (runs.length < MIN_RUNS) {
    throw new Error(`At least ${MIN_RUNS} completed server-verified Astra evaluations are required for ${scope.taskClass}.`)
  }

  const sourceRuns = runs.slice(0, MAX_RUNS).sort((a, b) => a.id.localeCompare(b.id))
  const benchmarkHash = hash(sourceRuns.map((run) => ({ id: run.id, promptHash: hash(run.prompt) })))
  const evaluatorHash = hash(sourceRuns.map((run) => ({
    id: run.id,
    judgeProvider: run.judge_provider,
    judgeModel: run.judge_model,
    criteria: run.metadata?.['criteria'] ?? null,
  })))
  const modelConfigHash = hash({
    engineId: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    provider: 'compatible',
    model,
    taskClass: scope.taskClass,
    routingAuthority: BLACKSTAR_ASTRA_ENGINE_PROFILE.routingAuthority,
  })

  const suiteId = `blackstar-astra-${scope.taskClass}-operator-v1`
  const { data, error } = await supabaseAdmin.rpc('certify_native_intelligence_model_evaluation', {
    p_run_ids: sourceRuns.map((run) => run.id),
    p_model_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    p_provider: 'compatible',
    p_model: model,
    p_suite_id: suiteId,
    p_task_class: scope.taskClass,
    p_benchmark_hash: benchmarkHash,
    p_evaluator_hash: evaluatorHash,
    p_model_config_hash: modelConfigHash,
    p_verifier: VERIFIER_ID,
  })
  if (error) throw new Error(error.message)

  const evidence = Array.isArray(data) ? data[0] : data
  return {
    id: evidence?.id ?? null,
    taskClass: scope.taskClass,
    provider: 'compatible' as const,
    model,
    suiteId,
    sampleCount: sourceRuns.length,
    score: evidence?.score == null ? null : Number(evidence.score),
    completedAt: evidence?.completed_at ?? null,
    verifiedAt: evidence?.verified_at ?? null,
  }
}
