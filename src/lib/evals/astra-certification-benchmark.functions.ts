import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'
import { safeAstraCandidateModelId } from './astra-candidate-route-probe-diagnostics'
import { readAstraCertificationFailureStage, safeAstraCertificationStageFailure } from './astra-certification-stage-diagnostics'

const taskClassSchema = z.enum(['general', 'reasoning', 'coding', 'tool_use', 'vision', 'agentic'])
const textTaskClassSchema = z.enum(['general', 'reasoning', 'coding', 'tool_use', 'agentic'])
const providerSchema = z.enum(['openai', 'groq', 'lovable', 'gemini'])
const judgeProviderSchema = z.enum(['openai', 'groq'])
const SAFE_CREDENTIAL_FINGERPRINT = /^[a-f0-9]{12}$/

type CandidateModelDiagnostic = {
  expectedModel?: unknown
  advertisedModelIds?: unknown
}

function safeCandidateModelDiagnostic(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const diagnostic = (error as { astraCandidateModelDiagnostic?: CandidateModelDiagnostic }).astraCandidateModelDiagnostic
  if (!diagnostic || typeof diagnostic !== 'object') return null
  const expectedModel = safeAstraCandidateModelId(typeof diagnostic.expectedModel === 'string' ? diagnostic.expectedModel : '') ?? undefined
  const advertisedModelIds = Array.isArray(diagnostic.advertisedModelIds)
    ? diagnostic.advertisedModelIds
      .map((value) => safeAstraCandidateModelId(typeof value === 'string' ? value : ''))
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 5)
    : []
  if (!expectedModel && !advertisedModelIds.length) return null
  return { expectedModel, advertisedModelIds }
}

function classifyAstraTextCertificationFailure(error: unknown) {
  const stage = readAstraCertificationFailureStage(error)
  if (stage) {
    const failure = safeAstraCertificationStageFailure(stage)
    if (stage === 'candidate_model_not_found') {
      const diagnostic = safeCandidateModelDiagnostic(error)
      if (diagnostic) {
        const pinned = diagnostic.expectedModel ? ` Pinned candidate: ${diagnostic.expectedModel}.` : ''
        const advertised = diagnostic.advertisedModelIds.length
          ? ` Advertised model IDs: ${diagnostic.advertisedModelIds.join(', ')}.`
          : ''
        return {
          ...failure,
          message: `${failure.message}${pinned}${advertised}`,
          ...(diagnostic.expectedModel ? { expectedModel: diagnostic.expectedModel } : {}),
          ...(diagnostic.advertisedModelIds.length ? { advertisedModelIds: diagnostic.advertisedModelIds } : {}),
        } as const
      }
    }
    return failure
  }

  const raw = error instanceof Error ? error.message : ''
  const message = raw.toLowerCase()

  if (message.includes('serving is not configured') || message.includes('serving identity')) {
    return { code: 'astra_serving_unavailable', message: 'Blackstar Astra serving is not available for this certification case.' } as const
  }
  if (message.includes('freellm') && (message.includes('not configured') || message.includes('required for trusted'))) {
    return { code: 'evaluator_not_ready', message: 'The authenticated, route-pinned independent evaluator is not ready for trusted text certification.' } as const
  }
  if (message.includes('unknown astra text certification benchmark case')) {
    return { code: 'benchmark_case_invalid', message: 'The selected server-owned certification case is no longer valid.' } as const
  }

  return { code: 'certification_case_failed', message: 'The trusted Astra certification case failed before it could be attested.' } as const
}

async function addSafeCredentialFingerprint<T extends { code: string; message: string }>(failure: T) {
  if (failure.code !== 'candidate_credentials_rejected') return failure
  const credential = process.env['OPENAI_COMPATIBLE_API_KEY']?.trim()
  if (!credential) return failure
  const { createHash } = await import('node:crypto')
  const fingerprint = createHash('sha256').update(credential, 'utf8').digest('hex').slice(0, 12)
  if (!SAFE_CREDENTIAL_FINGERPRINT.test(fingerprint)) return failure
  return {
    ...failure,
    credentialFingerprint: fingerprint,
    message: `${failure.message} Runtime credential fingerprint: ${fingerprint}.`,
  }
}

export const getAstraCertificationBenchmark = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    taskClass: taskClassSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ getAstraCertificationBenchmarkPlan }, { listServerApprovedAstraCertificationJudges }] = await Promise.all([
      import('./astra-certification-benchmark.server'),
      import('./astra-certification-judge-policy.server'),
    ])
    const plan = await getAstraCertificationBenchmarkPlan({ userId: context.userId, orgId: data.orgId ?? null, taskClass: data.taskClass })
    const trustedJudges = listServerApprovedAstraCertificationJudges()
      .filter((judge) => data.taskClass !== 'vision' || judge.provider !== 'freellm')
      .map((judge) => ({ provider: judge.provider, model: judge.model, label: judge.label }))
    return { ...plan, trustedJudges }
  })

export const runAstraTextCertificationCase = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    taskClass: textTaskClassSchema,
    caseId: z.string().trim().min(1).max(120),
  }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { runTrustedAstraTextCertificationCase } = await import('./astra-text-certification-run.server')
      const result = await runTrustedAstraTextCertificationCase({
        userId: context.userId,
        orgId: data.orgId ?? null,
        taskClass: data.taskClass,
        caseId: data.caseId,
      })
      await writeAudit({
        userId: context.userId,
        orgId: data.orgId ?? null,
        action: 'native_intelligence.astra_text_benchmark_completed',
        targetType: 'model_eval_run',
        targetId: result.runId,
        status: 'success',
        metadata: {
          taskClass: result.taskClass,
          provider: result.provider,
          model: result.model,
          suiteId: result.suiteId,
          caseId: result.caseId,
          judgeProvider: result.judgeProvider,
          judgeModel: result.judgeModel,
          routedProvider: result.routedProvider,
          routedModel: result.routedModel,
          fallbackAttempts: result.fallbackAttempts,
        },
      })
      return { ok: true as const, ...result }
    } catch (error) {
      const failure = await addSafeCredentialFingerprint(classifyAstraTextCertificationFailure(error))
      await writeAudit({
        userId: context.userId,
        orgId: data.orgId ?? null,
        action: 'native_intelligence.astra_text_benchmark_failed',
        targetType: 'astra_certification_case',
        targetId: data.caseId,
        status: 'failed',
        metadata: {
          taskClass: data.taskClass,
          caseId: data.caseId,
          diagnostic_code: failure.code,
        },
      })
      return { ok: false as const, ...failure }
    }
  })

export const runAstraVisionCertificationCase = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    caseId: z.string().trim().min(1).max(120),
    reference: z.object({ provider: providerSchema, model: z.string().trim().min(1).max(160) }),
    judge: z.object({ provider: judgeProviderSchema, model: z.string().trim().min(1).max(160) }),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { runTrustedAstraVisionCertificationCase } = await import('./astra-vision-certification-run.server')
    return runTrustedAstraVisionCertificationCase({
      userId: context.userId,
      orgId: data.orgId ?? null,
      caseId: data.caseId,
      reference: data.reference,
      judge: data.judge,
    })
  })

export const attestAstraCertificationRun = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    taskClass: taskClassSchema,
    runId: z.string().uuid(),
    caseId: z.string().trim().min(1).max(120),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { attestAstraCertificationBenchmarkRun } = await import('./astra-certification-benchmark.server')
    const result = await attestAstraCertificationBenchmarkRun({
      userId: context.userId,
      orgId: data.orgId ?? null,
      taskClass: data.taskClass,
      runId: data.runId,
      caseId: data.caseId,
    })
    await writeAudit({
      userId: context.userId,
      orgId: data.orgId ?? null,
      action: 'native_intelligence.astra_benchmark_attested',
      targetType: 'model_eval_run',
      targetId: result.runId,
      status: 'success',
      metadata: { taskClass: result.taskClass, provider: result.provider, model: result.model, suiteId: result.suiteId, caseId: result.caseId },
    })
    return result
  })
