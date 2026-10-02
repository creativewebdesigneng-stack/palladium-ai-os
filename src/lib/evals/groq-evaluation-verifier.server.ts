import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { resolveModel } from '@/lib/runtime/model-gateway.server'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

type Scope = {
  userId: string
  orgId?: string | null
  taskClass: NativeIntelligenceTaskClass
}

type AdminDb = {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

const db = supabaseAdmin as unknown as AdminDb
export const GROQ_EVIDENCE_MODEL_ID = 'external-groq-evidence-route'
export const GROQ_EVIDENCE_MIN_RUNS = 20
export const GROQ_EVIDENCE_VERIFIER = 'blackstar-groq-evidence-verifier-v1'

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
}

function hash(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function groqModel() {
  return resolveModel('groq', process.env['GROQ_ROUTING_MODEL']?.trim() || null)
}

async function assertScope(scope: Scope) {
  if (!scope.orgId) return
  const { data, error } = await db.from('organisation_members')
    .select('role')
    .eq('org_id', scope.orgId)
    .eq('user_id', scope.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You do not have access to this workspace.')
}

async function matchingGroqRuns(scope: Scope) {
  await assertScope(scope)
  if (!process.env['GROQ_API_KEY']?.trim()) throw new Error('Groq is not configured on this deployment.')
  const model = groqModel()
  let query = db.from('model_eval_runs')
    .select('id,user_id,org_id,prompt,judge_provider,judge_model,metadata,completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(500)
  query = scope.orgId
    ? query.eq('org_id', scope.orgId)
    : query.is('org_id', null).eq('user_id', scope.userId)
  const { data: runs, error } = await query
  if (error) throw new Error(error.message)

  const tagged = (runs ?? []).filter((run: any) =>
    run?.metadata?.taskClass === scope.taskClass &&
    run?.judge_provider &&
    run.judge_provider !== 'groq',
  )
  if (!tagged.length) {
    return {
      model,
      runs: [] as any[],
      responseByRun: new Map<string, any>(),
      scoreByResponse: new Map<string, any>(),
    }
  }

  const runIds = tagged.map((run: any) => run.id)
  const [{ data: responses, error: responseError }, { data: scores, error: scoreError }] = await Promise.all([
    db.from('model_eval_responses')
      .select('id,run_id,provider,model,latency_ms,input_tokens,output_tokens,metadata')
      .in('run_id', runIds)
      .eq('provider', 'groq')
      .eq('model', model),
    db.from('model_eval_scores')
      .select('run_id,response_id,score,evaluator_type')
      .in('run_id', runIds),
  ])
  if (responseError) throw new Error(responseError.message)
  if (scoreError) throw new Error(scoreError.message)

  const responseByRun = new Map<string, any>()
  for (const response of responses ?? []) {
    if (!responseByRun.has(String(response.run_id))) responseByRun.set(String(response.run_id), response)
  }
  const scoreByResponse = new Map<string, any>((scores ?? []).map((score: any) => [String(score.response_id), score]))

  const verified = tagged.filter((run: any) => {
    const response = responseByRun.get(String(run.id))
    if (!response) return false
    const score = scoreByResponse.get(String(response.id))
    if (!score || score.evaluator_type !== 'llm_judge') return false
    const numeric = Number(score.score)
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return false
    if ((scope.taskClass === 'tool_use' || scope.taskClass === 'agentic') && response.metadata?.toolUseObserved !== true) return false
    return true
  })

  return { model, runs: verified, responseByRun, scoreByResponse }
}

export async function getGroqCertificationStatus(scope: Scope) {
  const { model, runs } = await matchingGroqRuns(scope)
  return {
    taskClass: scope.taskClass,
    provider: 'groq' as const,
    model,
    completedRuns: runs.length,
    minimumRuns: GROQ_EVIDENCE_MIN_RUNS,
    readyToCertify: runs.length >= GROQ_EVIDENCE_MIN_RUNS,
  }
}

export async function certifyGroqEvaluation(scope: Scope) {
  const { model, runs, responseByRun, scoreByResponse } = await matchingGroqRuns(scope)
  if (runs.length < GROQ_EVIDENCE_MIN_RUNS) {
    throw new Error(`At least ${GROQ_EVIDENCE_MIN_RUNS} independently judged Groq runs are required for ${scope.taskClass} certification.`)
  }
  const sourceRuns = runs.slice(0, GROQ_EVIDENCE_MIN_RUNS)
  const benchmarkHash = hash(sourceRuns.map((run: any) => ({
    prompt: run.prompt,
    taskClass: run.metadata?.taskClass,
    toolUseObserved: responseByRun.get(String(run.id))?.metadata?.toolUseObserved === true,
  })))
  const evaluatorHash = hash(sourceRuns.map((run: any) => ({
    judgeProvider: run.judge_provider,
    judgeModel: run.judge_model,
    evaluatorType: scoreByResponse.get(String(responseByRun.get(String(run.id))?.id))?.evaluator_type,
  })))
  const modelConfigHash = hash({
    modelId: GROQ_EVIDENCE_MODEL_ID,
    provider: 'groq',
    model,
    taskClass: scope.taskClass,
    routingAuthority: 'verified-evaluation-only',
  })
  const { data, error } = await db.rpc('certify_native_intelligence_model_evaluation', {
    p_run_ids: sourceRuns.map((run: any) => run.id),
    p_model_id: GROQ_EVIDENCE_MODEL_ID,
    p_provider: 'groq',
    p_model: model,
    p_suite_id: `groq-evidence-v1:${scope.taskClass}`,
    p_task_class: scope.taskClass,
    p_benchmark_hash: benchmarkHash,
    p_evaluator_hash: evaluatorHash,
    p_model_config_hash: modelConfigHash,
    p_verifier: GROQ_EVIDENCE_VERIFIER,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : data as Record<string, unknown> | null
  return {
    id: typeof row?.['id'] === 'string' ? row['id'] : null,
    taskClass: scope.taskClass,
    provider: 'groq' as const,
    model,
    suiteId: `groq-evidence-v1:${scope.taskClass}`,
    sampleCount: sourceRuns.length,
    score: row?.['score'] == null ? null : Number(row['score']),
    completedAt: typeof row?.['completed_at'] === 'string' ? row['completed_at'] : null,
    verifiedAt: typeof row?.['verified_at'] === 'string' ? row['verified_at'] : null,
  }
}
