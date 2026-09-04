import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { buildBlackstarPerceptionPlan } from './multimodal-perception'

const modality = z.enum(['text', 'image', 'audio', 'video', 'sensor'])
const sensitivity = z.enum(['public', 'internal', 'confidential', 'restricted'])

const inputSchema = z.object({
  inputs: z.array(z.object({
    id: z.string().trim().min(1).max(120),
    modality,
    source: z.string().trim().min(1).max(4000),
    sensitivity: sensitivity.optional(),
    durationSeconds: z.number().nonnegative().max(86400).optional(),
    sizeBytes: z.number().int().nonnegative().max(1024 * 1024 * 1024).optional(),
  })).min(1).max(100),
  policy: z.object({
    allowedModalities: z.array(modality).max(5).optional(),
    maximumInputs: z.number().int().min(1).max(100).optional(),
    maximumDurationSeconds: z.number().positive().max(86400).optional(),
    maximumSizeBytes: z.number().int().positive().max(1024 * 1024 * 1024).optional(),
    allowRestricted: z.boolean().optional(),
    requireApprovalForRestricted: z.boolean().optional(),
  }).optional(),
})

export function validateBlackstarPerceptionRequest(input: unknown) {
  return inputSchema.parse(input)
}

export const planBlackstarMultimodalPerception = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateBlackstarPerceptionRequest)
  .handler(async ({ data }) => {
    return buildBlackstarPerceptionPlan(data.inputs, data.policy ?? {})
  })
