import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
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

type ArenaResponse = {
  id: string
  run_id: string
  provider: string
  model: string
  response_text: string
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
}

type ArenaScore = {
  run_id: string
  response_id: string
  evaluator_type: string
  score: number | string
  verdict: string | null
  reasoning: string | null
  criteria: unknown
}

type ProvenanceResponse = Omit<ArenaResponse, 'run_id'>
type ProvenanceScore = Omit<ArenaScore, 'run_id'>

type ProvenanceInput = {
  runId: string
  userId: string
  orgId: string | null
  taskClass: NativeIntelligenceTaskClass
  model: string
  prompt: string
  judgeProvider: string | null
  judgeModel: string | null
  criteria: unknown
  responses: ProvenanceResponse[]
  scores: ProvenanceScore[]
}

type AdminDb = {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

const MIN_RUNS = 20
const MAX_RUNS = 100
const VERIFIER_ID = 'blackstar-native-intelligence-verifier-v1'
const PROVENANCE_VERSION = 1
const astraEvalAdmin = supabaseAdmin as unknown as AdminDb

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
}

function hash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function provenanceSecret(): string {
  const secret = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!secret) throw new Error('Astra evaluation provenance is unavailable because the server verification key is not configured.')
  return secret
}

function normalizeProvenance(input: ProvenanceInput) {
  return {
    version: PROVENANCE_VERSION,
    runId: input.runId,
    userId: input.userId,
    orgId: input.orgId,
    taskClass: input.taskClass,
    provider: 'compatible',
    model: input.model,
    prompt: input.prompt,
    judgeProvider: input.judgeProvider,
    judgeModel: input.judgeModel,
    criteria: input.criteria,
    responses: input.responses
      .map((response) => ({
        id: response.id,
        provider: response.provider,
        model: response.model,
        responseText: response.response_text,
        latencyMs: response.latency_ms,
        inputTokens: response.input_tokens,
        outputTokens: response.output_tokens,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    scores: input.scores
      .map((score) => ({
        responseId: score.response_id,
        evaluatorType: score.evaluator_type,
        score: Number(score.score),
        verdict: score.verdict,
        reasoning: score.reasoning,
        criteria: score.criteria,
      }))
      .sort((a, b) => a.responseId.localeCompare(b.responseId)),
  }
}

export function signAstraEvaluationEvidence(input: ProvenanceInput): string {
  return createHmac('sha256', provenanceSecret())
    .update(stableJson(normalizeProvenance(input)))
    .digest('hex')
}

function validProvenanceSignature(signature: unknown, input: ProvenanceInput): boolean {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = Buffer.from(signAstraEvaluationEvidence(input), 'hex')
  const supplied = Buffer.from(signature, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function astraMetadata(run: ArenaRun) {
  const value = run.metadata?.['astra_activation']
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

async function assertScopeAccess(scope: Scope) {
  if (!scope.orgId) return
  const { data, error } = await astraEvalAdmin
    .from('organisation_members')
    .select('role')
    .eq('org_id', scope.orgId)
    .eq('user_id', scope.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You do not have access to this workspace.')
}

async function matchingRuns(scope: Scope) {
  await assertScopeAccess(scope)
  if (!isBlackstarAstraEngineConfigured()) {
    throw new Error('Blackstar Astra serving is not configured on this deployment.')
  }

  const model = blackstarAstraModelForTaskClass(scope.taskClass)
  let query = astraEvalAdmin
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
      && metadata?.['provenance_version'] === PROVENANCE_VERSION
      && metadata?.['task_class'] === scope.taskClass
      && metadata?.['provider'] === 'compatible'
      && metadata?.['model'] === model
  })

  if (!tagged.length) return { model, runs: [] as ArenaRun[] }

  const runIds = tagged.map((run) => run.id)
  const [{ data: responseData, error: responseError }, { data: scoreData, error: scoreError }] = await Promise.all([
    astraEvalAdmin
      .from('model_eval_responses')
      .select('id,run_id,provider,model,response_text,latency_ms,input_tokens,output_tokens')
      .in('run_id', runIds),
    astraEvalAdmin
      .from('model_eval_scores')
      .select('run_id,response_id,evaluator_type,score,verdict,reasoning,criteria')
      .in('run_id', runIds),
  ])
  if (responseError) throw new Error(responseError.message)
  if (scoreError) throw new Error(scoreError.message)

  const responses = (responseData ?? []) as ArenaResponse[]
  const scores = (scoreData ?? []) as ArenaScore[]
  const verifiedRuns = tagged.filter((run) => {
    const metadata = astraMetadata(run)
    const runResponses = responses.filter((response) => response.run_id === run.id)
    const runScores = scores.filter((score) => score.run_id === run.id)
    const hasExactAstraResponse = runResponses.some((response) => response.provider === 'compatible' && response.model === model)
    if (!hasExactAstraResponse || runResponses.length === 0 || runScores.length !== runResponses.length) return false

    return validProvenanceSignature(metadata?.['provenance_signature'], {
      runId: run.id,
      userId: run.user_id,
      orgId: run.org_id,
      taskClass: scope.taskClass,
      model,
      prompt: run.prompt,
      judgeProvider: run.judge_provider,
      judgeModel: run.judge_model,
      criteria: run.metadata?.['criteria'] ?? null,
      responses: runResponses.map(({ run_id: _runId, ...response }) => response),
      scores: runScores.map(({ run_id: _runId, ...score }) => score),
    })
  })

  return { model, runs: verifiedRuns }
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
  const { data, error } = await astraEvalAdmin.rpc('certify_native_intelligence_model_evaluation', {
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

  const evidence = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : data as Record<string, unknown> | null
  return {
    id: typeof evidence?.['id'] === 'string' ? evidence['id'] : null,
    taskClass: scope.taskClass,
    provider: 'compatible' as const,
    model,
    suiteId,
    sampleCount: sourceRuns.length,
    score: evidence?.['score'] == null ? null : Number(evidence['score']),
    completedAt: typeof evidence?.['completed_at'] === 'string' ? evidence['completed_at'] : null,
    verifiedAt: typeof evidence?.['verified_at'] === 'string' ? evidence['verified_at'] : null,
  }
}
