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

export const getGroqEvaluationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    taskClass: taskClassSchema.optional(),
    limit: z.number().int().min(10).max(500).optional().default(200),
  }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: runs, error: runsError } = await sb.from('model_eval_runs')
      .select('id,metadata,status,created_at,completed_at')
      .eq('user_id', context.userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(data.limit)
    if (runsError) throw new Error(runsError.message)
    const runIds = (runs ?? []).map((run: any) => String(run.id))
    if (!runIds.length) {
      return {
        provider: 'groq',
        classes: GROQ_TASK_CLASSES.map((taskClass) => summariseGroqEvidence([], taskClass)),
        recommendation: 'insufficient_evidence' as const,
      }
    }

    const [{ data: responses, error: responseError }, { data: scores, error: scoreError }] = await Promise.all([
      sb.from('model_eval_responses')
        .select('id,run_id,provider,model,latency_ms,input_tokens,output_tokens,metadata')
        .in('run_id', runIds)
        .eq('provider', 'groq'),
      sb.from('model_eval_scores')
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
    const requested = data.taskClass ? classes.find((item) => item.taskClass === data.taskClass) ?? null : null
    return {
      provider: 'groq',
      sampleCount: samples.length,
      requested,
      classes,
      recommendation: requested?.qualified ? 'qualified_for_task_class' as const : 'insufficient_evidence' as const,
      note: 'Evidence status is observational. It never changes model routing by itself.',
    }
  })
