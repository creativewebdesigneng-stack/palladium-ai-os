import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import {
  astraCertificationSuiteId,
  getAstraCertificationBenchmarkCase,
  isAstraCertificationTaskClass,
  listAstraCertificationBenchmarkCases,
} from '@/lib/evals/astra-certification-benchmark-suite'
import {
  signAstraEvaluationEvidence,
  type AstraEvaluationProvenanceInput,
} from '@/lib/evals/astra-evaluation-verifier.server'
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

type AttestationInput = Scope & {
  runId: string
  caseId: string
}

type AdminDb = { from: (table: string) => any }
const db = supabaseAdmin as unknown as AdminDb

function safeEqualHex(a: unknown, b: string): boolean {
  if (typeof a !== 'string' || !/^[a-f0-9]{64}$/i.test(a)) return false
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

function metadataObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
}

async function assertScopeAccess(scope: Scope) {
  if (!scope.orgId) return
  const { data, error } = await db.from('organisation_members')
    .select('role')
    .eq('org_id', scope.orgId)
    .eq('user_id', scope.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You do not have access to this workspace.')
}

export async function getAstraCertificationBenchmarkPlan(scope: Scope) {
  await assertScopeAccess(scope)
  if (!isAstraCertificationTaskClass(scope.taskClass)) {
    return {
      taskClass: scope.taskClass,
      certificationSupported: false,
      reason: 'Vision requires a multimodal benchmark path.',
      suiteId: null,
      cases: [],
    }
  }

  const suiteId = astraCertificationSuiteId(scope.taskClass)
  const cases = listAstraCertificationBenchmarkCases(scope.taskClass)
  let query = db.from('model_eval_runs')
    .select('id,metadata,status,completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(200)

  query = scope.orgId
    ? query.eq('org_id', scope.orgId)
    : query.is('org_id', null).eq('user_id', scope.userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const completedCaseIds = new Set<string>()
  for (const row of data ?? []) {
    const astra = metadataObject(metadataObject(row.metadata)?.['astra_activation'])
    if (
      astra?.['server_verified'] === true
      && astra?.['provenance_version'] === 2
      && astra?.['suite_id'] === suiteId
      && typeof astra?.['case_id'] === 'string'
    ) completedCaseIds.add(astra['case_id'])
  }

  return {
    taskClass: scope.taskClass,
    certificationSupported: true,
    suiteId,
    completedCases: completedCaseIds.size,
    totalCases: cases.length,
    cases: cases.map((benchmarkCase) => ({
      caseId: benchmarkCase.caseId,
      name: benchmarkCase.name,
      prompt: benchmarkCase.prompt,
      criteria: [...benchmarkCase.criteria],
      completed: completedCaseIds.has(benchmarkCase.caseId),
    })),
  }
}

export async function attestAstraCertificationBenchmarkRun(input: AttestationInput) {
  await assertScopeAccess(input)
  if (!isAstraCertificationTaskClass(input.taskClass)) {
    throw new Error('This task class does not have a trusted text benchmark suite.')
  }
  if (!isBlackstarAstraEngineConfigured()) {
    throw new Error('Blackstar Astra serving is not configured on this deployment.')
  }

  const benchmarkCase = getAstraCertificationBenchmarkCase(input.taskClass, input.caseId)
  if (!benchmarkCase) throw new Error('Unknown Astra certification benchmark case.')
  const expectedModel = blackstarAstraModelForTaskClass(input.taskClass)
  const { data: run, error: runError } = await db.from('model_eval_runs')
    .select('id,user_id,org_id,prompt,status,judge_provider,judge_model,metadata,completed_at')
    .eq('id', input.runId)
    .maybeSingle()
  if (runError) throw new Error(runError.message)
  if (!run || run.status !== 'completed' || !run.completed_at) throw new Error('Only completed Model Arena runs can be attested.')
  if (input.orgId) {
    if (run.org_id !== input.orgId) throw new Error('Evaluation run does not belong to this workspace.')
  } else if (run.org_id !== null || run.user_id !== input.userId) {
    throw new Error('Evaluation run does not belong to this user scope.')
  }
  if (run.prompt !== benchmarkCase.prompt) throw new Error('Evaluation prompt does not match the trusted benchmark case.')
  const runMetadata = metadataObject(run.metadata) ?? {}
  if (stableJson(runMetadata['criteria'] ?? null) !== stableJson(benchmarkCase.criteria)) {
    throw new Error('Evaluation criteria do not match the trusted benchmark case.')
  }

  const astra = metadataObject(runMetadata['astra_activation'])
  if (
    astra?.['server_verified'] !== true
    || astra?.['task_class'] !== input.taskClass
    || astra?.['provider'] !== 'compatible'
    || astra?.['model'] !== expectedModel
    || astra?.['engine_id'] !== BLACKSTAR_ASTRA_ENGINE_PROFILE.id
  ) throw new Error('Evaluation was not produced by the exact configured Astra serving identity.')

  const [{ data: responses, error: responseError }, { data: scores, error: scoreError }] = await Promise.all([
    db.from('model_eval_responses')
      .select('id,run_id,provider,model,response_text,latency_ms,input_tokens,output_tokens')
      .eq('run_id', run.id)
      .order('created_at', { ascending: true }),
    db.from('model_eval_scores')
      .select('run_id,response_id,evaluator_type,score,verdict,reasoning,criteria')
      .eq('run_id', run.id),
  ])
  if (responseError) throw new Error(responseError.message)
  if (scoreError) throw new Error(scoreError.message)
  if (!responses?.length || scores?.length !== responses.length) throw new Error('Evaluation evidence is incomplete.')
  if (!responses.some((response: any) => response.provider === 'compatible' && response.model === expectedModel)) {
    throw new Error('Evaluation is missing the exact Astra response.')
  }

  const baseProvenance: AstraEvaluationProvenanceInput = {
    runId: run.id,
    userId: run.user_id,
    orgId: run.org_id,
    taskClass: input.taskClass,
    model: expectedModel,
    prompt: run.prompt,
    judgeProvider: run.judge_provider,
    judgeModel: run.judge_model,
    criteria: runMetadata['criteria'] ?? null,
    responses: responses.map(({ run_id: _runId, ...response }: any) => response),
    scores: scores.map(({ run_id: _runId, ...score }: any) => score),
  }
  const expectedBaseSignature = signAstraEvaluationEvidence(baseProvenance)
  if (!safeEqualHex(astra['provenance_signature'], expectedBaseSignature)) {
    throw new Error('Evaluation provenance signature is invalid or has been modified.')
  }

  const suiteId = benchmarkCase.suiteId
  const provenanceSignature = signAstraEvaluationEvidence({
    ...baseProvenance,
    suiteId,
    caseId: benchmarkCase.caseId,
  })
  const nextMetadata = {
    ...runMetadata,
    astra_activation: {
      ...astra,
      provenance_version: 2,
      suite_id: suiteId,
      case_id: benchmarkCase.caseId,
      provenance_signature: provenanceSignature,
    },
  }
  const { error: updateError } = await db.from('model_eval_runs')
    .update({ metadata: nextMetadata })
    .eq('id', run.id)
  if (updateError) throw new Error(updateError.message)

  return {
    runId: run.id,
    taskClass: input.taskClass,
    provider: 'compatible' as const,
    model: expectedModel,
    suiteId,
    caseId: benchmarkCase.caseId,
    attested: true,
  }
}
