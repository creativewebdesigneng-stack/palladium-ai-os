import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  GROQ_TASK_CLASSES,
  configuredModelCostUsd,
  summariseGroqEvidence,
  type GroqEvidenceSample,
  type GroqTaskClass,
} from './groq-evidence-routing'

type Sb = { from: (table: string) => any }

const taskClassSchema = z.enum(GROQ_TASK_CLASSES)

async function buildGroqEvaluationStatus(args: {
  sb: Sb
  userId: string
  taskClass?: GroqTaskClass
  limit: number
}) {
  const { data: runs, error: runsError } = await args.sb.from('model_eval_runs')
    .select('id,metadata,status,created_at,completed_at')
    .eq('user_id', args.userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(args.limit)
  if (runsError) throw new Error(runsError.message)

  const runIds = (runs ?? []).map((run: any) => String(run.id))
  if (!runIds.length) {
    const classes = GROQ_TASK_CLASSES.map((taskClass) => summariseGroqEvidence([], taskClass))
    const requested = args.taskClass ? classes.find((item) => item.taskClass === args.taskClass) ?? null : null
    return {
      provider: 'groq' as const,
      sampleCount: 0,
      requested,
      classes,
      recommendation: 'insufficient_evidence' as const,
      note: 'Evidence status is observational. It never changes model routing by itself.',
    }
  }

  const [{ data: responses, error: responseError }, { data: scores, error: scoreError }] = await Promise.all([
    args.sb.from('model_eval_responses')
      .select('id,run_id,provider,model,latency_ms,input_tokens,output_tokens,metadata')
      .in('run_id', runIds)
      .eq('provider', 'groq'),
    args.sb.from('model_eval_scores')
      .select('response_id,score')
      .in('run_id', runIds),
  ])
  if (responseError) throw new Error(responseError.message)
  if (scoreError) throw new Error(scoreError.message)

  const runById = new Map((runs ?? []).map((run: any) => [String(run.id), run]))
  const scoreByResponse = new Map((scores ?? []).map((score: any) => [String(score.response_id), Number(score.score) / 100]))
  const samples: GroqEvidenceSample[] = []
  for (const row of responses ?? []) {
    const run: any = runById.get(String(row.run_id))
    const runMeta = run?.metadata && typeof run.metadata === 'object' ? run.metadata : {}
    const responseMeta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
    const taskClass = String(responseMeta.taskClass ?? runMeta.taskClass ?? 'general') as GroqTaskClass
    if (!GROQ_TASK_CLASSES.includes(taskClass)) continue
    const score = scoreByResponse.get(String(row.id))
    if (typeof score !== 'number' || !Number.isFinite(score)) continue
    const inputTokens = Number(row.input_tokens ?? 0)
    const outputTokens = Number(row.output_tokens ?? 0)
    samples.push({
      provider: 'groq',
      model: String(row.model),
      taskClass,
      score,
      latencyMs: Number(row.latency_ms ?? 0),
      inputTokens,
      outputTokens,
      toolUseObserved: responseMeta.toolUseObserved === true,
      costUsd: configuredModelCostUsd({
        provider: 'groq',
        model: String(row.model),
        inputTokens,
        outputTokens,
      }),
    })
  }

  const classes = GROQ_TASK_CLASSES.map((taskClass) => summariseGroqEvidence(samples, taskClass))
  const requested = args.taskClass ? classes.find((item) => item.taskClass === args.taskClass) ?? null : null
  return {
    provider: 'groq' as const,
    sampleCount: samples.length,
    requested,
    classes,
    recommendation: requested?.qualified ? 'qualified_for_task_class' as const : 'insufficient_evidence' as const,
    note: 'Evidence status is observational. It never changes model routing by itself.',
  }
}

export const getGroqEvaluationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    taskClass: taskClassSchema.optional(),
    limit: z.number().int().min(10).max(500).optional().default(200),
  }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    return buildGroqEvaluationStatus({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      ...(data.taskClass ? { taskClass: data.taskClass } : {}),
      limit: data.limit,
    })
  })


const GROQ_RETIRED_MODEL_PREFIXES = [
  'groq/compound',
  'compound-beta',
] as const

function isRetiredGroqModel(id: string) {
  const value = id.trim().toLowerCase()
  return GROQ_RETIRED_MODEL_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export const getGroqRuntimeIntelligence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    limit: z.number().int().min(10).max(500).optional().default(200),
  }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const evaluation = await buildGroqEvaluationStatus({
      sb: context.supabase as unknown as Sb,
      userId: context.userId,
      limit: data.limit,
    })

    const apiKey = process.env['GROQ_API_KEY']?.trim()
    if (!apiKey) {
      return {
        configured: false,
        activeModels: [] as string[],
        retiredModelsBlocked: [...GROQ_RETIRED_MODEL_PREFIXES],
        evaluation,
        note: 'Groq is not configured on this deployment. No routing recommendation is inferred.',
      }
    }

    let activeModels: string[] = []
    let catalogError: string | null = null
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) {
        catalogError = `Groq model catalogue returned HTTP ${response.status}.`
      } else {
        const payload = await response.json() as { data?: Array<{ id?: unknown; active?: unknown }> }
        activeModels = (payload.data ?? [])
          .map((row) => typeof row?.id === 'string' ? row.id : '')
          .filter((id) => id && !isRetiredGroqModel(id))
          .sort()
      }
    } catch (error) {
      catalogError = error instanceof Error ? error.message : 'Groq model catalogue is unavailable.'
    }

    const qualifiedClasses = (evaluation.classes ?? [])
      .filter((item) => item.qualified)
      .map((item) => item.taskClass)

    return {
      configured: true,
      activeModels,
      catalogError,
      retiredModelsBlocked: [...GROQ_RETIRED_MODEL_PREFIXES],
      evaluation,
      qualifiedClasses,
      routingPolicy: {
        providerNeutral: true,
        evidenceRequired: true,
        minimumSamplesPerClass: 20,
        qualityFloor: 0.75,
        toolUseFloor: 0.9,
      },
      note: qualifiedClasses.length
        ? 'Groq is evidence-qualified only for the listed task classes. Other classes stay on normal provider-neutral routing.'
        : 'Groq is configured, but no task class is evidence-qualified yet.',
    }
  })
