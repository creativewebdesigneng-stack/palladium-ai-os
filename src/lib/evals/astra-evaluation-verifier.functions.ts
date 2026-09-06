import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

const taskClassSchema = z.enum(['general', 'reasoning', 'coding', 'tool_use', 'vision', 'agentic'])
const inputSchema = z.object({
  orgId: z.string().uuid().nullish(),
  taskClass: taskClassSchema,
})

export const getAstraCertificationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getAstraEvaluationCertificationStatus } = await import('./astra-evaluation-verifier.server')
    return getAstraEvaluationCertificationStatus({
      userId: context.userId,
      orgId: data.orgId ?? null,
      taskClass: data.taskClass,
    })
  })

export const certifyAstraTaskClass = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { certifyAstraEvaluation } = await import('./astra-evaluation-verifier.server')
    const evidence = await certifyAstraEvaluation({
      userId: context.userId,
      orgId: data.orgId ?? null,
      taskClass: data.taskClass,
    })

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId ?? null,
      action: 'native_intelligence.astra_certified',
      targetType: 'model_eval_verified_evidence',
      ...(evidence.id ? { targetId: evidence.id } : {}),
      status: 'success',
      metadata: {
        taskClass: evidence.taskClass,
        provider: evidence.provider,
        model: evidence.model,
        suiteId: evidence.suiteId,
        sampleCount: evidence.sampleCount,
      },
    })

    return evidence
  })
