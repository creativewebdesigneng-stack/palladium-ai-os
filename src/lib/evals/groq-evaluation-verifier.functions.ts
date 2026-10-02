import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

const taskClassSchema = z.enum(['general','reasoning','coding','tool_use','agentic'])
const inputSchema = z.object({ orgId: z.string().uuid().nullish(), taskClass: taskClassSchema })

export const getGroqCertificationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getGroqCertificationStatus: status } = await import('./groq-evaluation-verifier.server')
    return status({ userId: context.userId, orgId: data.orgId ?? null, taskClass: data.taskClass })
  })

export const certifyGroqTaskClass = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { certifyGroqEvaluation } = await import('./groq-evaluation-verifier.server')
    const evidence = await certifyGroqEvaluation({ userId: context.userId, orgId: data.orgId ?? null, taskClass: data.taskClass })
    await writeAudit({
      userId: context.userId,
      orgId: data.orgId ?? null,
      action: 'model_routing.groq_certified',
      targetType: 'model_eval_verified_evidence',
      ...(evidence.id ? { targetId: evidence.id } : {}),
      status: 'success',
      metadata: { taskClass: evidence.taskClass, model: evidence.model, sampleCount: evidence.sampleCount, score: evidence.score },
    })
    return evidence
  })
