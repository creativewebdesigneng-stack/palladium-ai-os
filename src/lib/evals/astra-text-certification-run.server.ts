import { supabaseAdmin } from '@/integrations/supabase/client.server'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'
import {
  ASTRA_CERTIFICATION_PROVENANCE_VERSION,
  buildAstraCertificationExecutionPrompt,
  hashAstraCertificationExecutionPrompt,
  resolveAstraCertificationExecutionProfile,
} from './astra-certification-execution-profile'
import { getAstraCertificationBenchmarkCase, isAstraCertificationTaskClass } from './astra-certification-benchmark-suite'
import { isServerApprovedAstraCertificationJudge } from './astra-certification-judge-policy.server'
import { matchesPinnedFreeLlmRoute, runFreeLlmJudge, resolveFreeLlmEvaluatorConfig } from './freellm-evaluator.server'
import { hashAstraEvaluationSystemPrompt, signAstraEvaluationEvidence } from './astra-evaluation-verifier.server'
import { attestAstraCertificationBenchmarkRun } from './astra-certification-benchmark.server'
import { astraCertificationStageError, type AstraTextCertificationStage } from './astra-certification-stage-diagnostics'
import { BLACKSTAR_ASTRA_ENGINE_PROFILE, blackstarAstraModelForTaskClass, isBlackstarAstraEngineConfigured } from '@/lib/runtime/blackstar-astra-engine-profile'
import { ProviderError, runChatPinned } from '@/lib/runtime/model-gateway.server'

type Db = { from: (table: string) => any }
const db = supabaseAdmin as unknown as Db

type TextTaskClass = Exclude<NativeIntelligenceTaskClass, 'vision'>

type RunInput = {
  userId: string
  orgId?: string | null
  taskClass: TextTaskClass
  caseId: string
}

function parseSingleJudge(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw
  const first = fenced.indexOf('[')
  const last = fenced.lastIndexOf(']')
  if (first < 0 || last <= first) throw new Error('The FreeLLM judge returned an invalid score format.')
  const parsed = JSON.parse(fenced.slice(first, last + 1)) as Array<Record<string, unknown>>
  if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('The FreeLLM judge must score exactly one Astra candidate.')
  const entry = parsed[0] ?? {}
  const index = Number(entry['index'])
  const score = Number(entry['score'])
  if (index !== 0 || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('The FreeLLM judge returned an invalid Astra candidate score.')
  }
  return {
    score,
    verdict: typeof entry['verdict'] === 'string' ? entry['verdict'].slice(0, 120) : null,
    reasoning: typeof entry['reasoning'] === 'string' ? entry['reasoning'].slice(0, 2000) : null,
  }
}

async function assertScopeAccess(input: RunInput) {
  if (!input.orgId) return
  const { data, error } = await db.from('organisation_members').select('role').eq('org_id', input.orgId).eq('user_id', input.userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('You do not have access to this workspace.')
}

function candidateFailureStage(error: unknown): AstraTextCertificationStage {
  if (!(error instanceof ProviderError)) return 'candidate_execution'
  if (error.status === 401 || error.status === 403) return 'candidate_credentials_rejected'
  if (error.status === 429) return 'candidate_rate_limited'
  if (error.status === 502 || error.status === 503) return 'candidate_upstream_unavailable'
  if (error.status === 504 || error.status === 408) return 'candidate_timeout_or_unreachable'
  return 'candidate_execution'
}

export async function runTrustedAstraTextCertificationCase(input: RunInput) {
  await assertScopeAccess(input)
  if (!isAstraCertificationTaskClass(input.taskClass)) {
    throw new Error('This runner only supports trusted Astra text certification task classes.')
  }
  if (!isBlackstarAstraEngineConfigured()) throw new Error('Blackstar Astra serving is not configured on this deployment.')

  const benchmarkCase = getAstraCertificationBenchmarkCase(input.taskClass, input.caseId)
  if (!benchmarkCase || benchmarkCase.modality !== 'text') throw new Error('Unknown Astra text certification benchmark case.')

  const evaluator = resolveFreeLlmEvaluatorConfig()
  if (!evaluator.certificationConfigured || !evaluator.baseUrl || !evaluator.apiKey || !evaluator.model || !evaluator.routedProvider || !evaluator.routedModel || !isServerApprovedAstraCertificationJudge('freellm', evaluator.model)) {
    throw new Error('An authenticated, fully route-pinned, server-approved FreeLLM evaluator is required for trusted Astra text certification.')
  }

  const model = blackstarAstraModelForTaskClass(input.taskClass)
  const systemPromptHash = hashAstraEvaluationSystemPrompt(null)
  const executionProfile = resolveAstraCertificationExecutionProfile(input.taskClass, model)
  const executionPrompt = buildAstraCertificationExecutionPrompt(benchmarkCase.prompt, executionProfile)
  const executionPromptHash = hashAstraCertificationExecutionPrompt(executionPrompt)
  const runMetadata = {
    criteria: [...benchmarkCase.criteria],
    complianceApplied: false,
    astra_activation: {
      server_verified: false,
      provenance_version: ASTRA_CERTIFICATION_PROVENANCE_VERSION,
      system_prompt_hash: systemPromptHash,
      execution_profile: executionProfile,
      execution_prompt_hash: executionPromptHash,
      task_class: input.taskClass,
      provider: 'compatible',
      model,
      engine_id: BLACKSTAR_ASTRA_ENGINE_PROFILE.id,
    },
  }

  const { data: run, error: runError } = await db.from('model_eval_runs').insert({
    user_id: input.userId,
    org_id: input.orgId ?? null,
    name: benchmarkCase.name,
    prompt: benchmarkCase.prompt,
    evaluation_mode: 'llm_judge',
    status: 'running',
    judge_provider: 'freellm',
    judge_model: evaluator.model,
    metadata: runMetadata,
  }).select('id').single()
  if (runError || !run?.id) throw astraCertificationStageError('run_persistence')

  let stage: AstraTextCertificationStage = 'candidate_execution'
  try {
    const started = Date.now()
    stage = 'candidate_execution'
    let candidate
    try {
      candidate = await runChatPinned({
        provider: 'compatible',
        model,
        messages: [{ role: 'user', content: executionPrompt }],
        maxTokens: executionProfile.maxTokens,
        timeoutMs: executionProfile.timeoutMs,
      })
    } catch (error) {
      stage = candidateFailureStage(error)
      throw astraCertificationStageError(stage)
    }

    stage = 'candidate_identity'
    if (candidate.provider !== 'compatible' || candidate.model !== model) {
      throw astraCertificationStageError(stage)
    }

    stage = 'response_persistence'
    const { data: response, error: responseError } = await db.from('model_eval_responses').insert({
      run_id: run.id,
      provider: candidate.provider,
      model: candidate.model,
      label: 'Blackstar Astra',
      response_text: candidate.text,
      latency_ms: Math.max(0, Date.now() - started),
      input_tokens: candidate.usage.input,
      output_tokens: candidate.usage.output,
      metadata: { astraExecutionProfileId: executionProfile.id },
    }).select('id,provider,model,label,response_text,latency_ms,input_tokens,output_tokens').single()
    if (responseError || !response?.id) throw astraCertificationStageError(stage)

    stage = 'evaluator_request'
    const judgeResult = await runFreeLlmJudge({
      model: evaluator.model,
      messages: [
        {
          role: 'system',
          content: 'You are an impartial certification evaluator. Score the single candidate from 0 to 100 against the supplied criteria. Do not reward verbosity. Return ONLY a JSON array with one object containing index, score, verdict and reasoning.',
        },
        {
          role: 'user',
          content: `TRUSTED BENCHMARK PROMPT\n${benchmarkCase.prompt}\n\nCRITERIA\n${benchmarkCase.criteria.join('; ')}\n\nCANDIDATE\nRESPONSE 0\n${candidate.text}`,
        },
      ],
      temperature: 0,
      maxTokens: 1000,
      timeoutMs: 90_000,
    })

    stage = 'evaluator_identity'
    if (judgeResult.provider !== 'freellm' || judgeResult.model !== evaluator.model) {
      throw astraCertificationStageError(stage)
    }

    stage = 'evaluator_route'
    if (!matchesPinnedFreeLlmRoute(judgeResult)) {
      throw astraCertificationStageError(stage)
    }

    stage = 'judge_response'
    const judged = parseSingleJudge(judgeResult.text)
    const score = {
      run_id: run.id,
      response_id: response.id,
      evaluator_type: 'llm_judge',
      score: judged.score,
      verdict: judged.verdict,
      reasoning: judged.reasoning,
      criteria: {
        names: [...benchmarkCase.criteria],
        judgeProvider: judgeResult.provider,
        judgeModel: judgeResult.model,
        judgeRoutedVia: judgeResult.routedVia,
        judgeRoutedProvider: judgeResult.routedProvider,
        judgeRoutedModel: judgeResult.routedModel,
        judgeFallbackAttempts: judgeResult.fallbackAttempts,
      },
    }

    stage = 'score_persistence'
    const { error: scoreError } = await db.from('model_eval_scores').insert(score)
    if (scoreError) throw astraCertificationStageError(stage)

    stage = 'provenance_signing'
    const provenanceSignature = signAstraEvaluationEvidence({
      runId: run.id,
      userId: input.userId,
      orgId: input.orgId ?? null,
      taskClass: input.taskClass,
      model,
      prompt: benchmarkCase.prompt,
      systemPromptHash,
      executionProfile,
      executionPromptHash,
      judgeProvider: judgeResult.provider,
      judgeModel: judgeResult.model,
      criteria: [...benchmarkCase.criteria],
      responses: [response],
      scores: [score],
    })
    const completedMetadata = {
      ...runMetadata,
      astra_activation: {
        ...runMetadata.astra_activation,
        server_verified: true,
        provenance_signature: provenanceSignature,
      },
    }

    stage = 'run_finalize'
    const { error: completeError } = await db.from('model_eval_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      judge_provider: judgeResult.provider,
      judge_model: judgeResult.model,
      metadata: completedMetadata,
    }).eq('id', run.id)
    if (completeError) throw astraCertificationStageError(stage)

    stage = 'attestation'
    const attested = await attestAstraCertificationBenchmarkRun({
      userId: input.userId,
      orgId: input.orgId ?? null,
      taskClass: input.taskClass,
      runId: run.id,
      caseId: benchmarkCase.caseId,
    })

    return {
      ...attested,
      score: judged.score,
      judgeProvider: judgeResult.provider,
      judgeModel: judgeResult.model,
      routedVia: judgeResult.routedVia,
      routedProvider: judgeResult.routedProvider,
      routedModel: judgeResult.routedModel,
      fallbackAttempts: judgeResult.fallbackAttempts,
    }
  } catch (error) {
    const diagnostic = error instanceof Error && error.message.startsWith('BLACKSTAR_ASTRA_CERT_STAGE:')
      ? error
      : astraCertificationStageError(stage)
    await db.from('model_eval_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      metadata: { ...runMetadata, failure_stage: stage },
    }).eq('id', run.id)
    throw diagnostic
  }
}
