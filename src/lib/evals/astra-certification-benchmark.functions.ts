import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

const taskClassSchema = z.enum(['general', 'reasoning', 'coding', 'tool_use', 'vision', 'agentic'])

export const getAstraCertificationBenchmark = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    orgId: z.string().uuid().nullish(),
    taskClass: taskClassSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAstraCertificationBenchmarkPlan } = await import('./astra-certification-benchmark.server')
    return getAstraCertificationBenchmarkPlan({
      userId: context.userId,
      orgId: data.orgId ?? null,
      taskClass: data.taskClass,
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
      metadata: {
        taskClass: result.taskClass,
        provider: result.provider,
        model: result.model,
        suiteId: result.suiteId,
        caseId: result.caseId,
      },
    })
    return result
  })
