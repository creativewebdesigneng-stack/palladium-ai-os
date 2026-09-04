import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  buildBlackstarPerceptionPlan,
  type PerceptionInput,
  type PerceptionPolicy,
} from './multimodal-perception'

const modality = z.enum(['text', 'image', 'audio', 'video', 'sensor'])
const sensitivity = z.enum(['public', 'internal', 'confidential', 'restricted'])

const perceptionInputSchema = z.object({
  id: z.string().trim().min(1).max(120),
  modality,
  source: z.string().trim().min(1).max(4000),
  sensitivity: sensitivity.optional(),
  durationSeconds: z.number().nonnegative().max(86400).optional(),
  sizeBytes: z.number().int().nonnegative().max(1024 * 1024 * 1024).optional(),
})

const perceptionPolicySchema = z.object({
  allowedModalities: z.array(modality).max(5).optional(),
  maximumInputs: z.number().int().min(1).max(100).optional(),
  maximumDurationSeconds: z.number().positive().max(86400).optional(),
  maximumSizeBytes: z.number().int().positive().max(1024 * 1024 * 1024).optional(),
  allowRestricted: z.boolean().optional(),
  requireApprovalForRestricted: z.boolean().optional(),
})

const inputSchema = z.object({
  inputs: z.array(perceptionInputSchema).min(1).max(100),
  policy: perceptionPolicySchema.optional(),
})

type ValidatedInput = z.infer<typeof perceptionInputSchema>
type ValidatedPolicy = z.infer<typeof perceptionPolicySchema>

function normalizePerceptionInput(input: ValidatedInput): PerceptionInput {
  return {
    id: input.id,
    modality: input.modality,
    source: input.source,
    ...(input.sensitivity !== undefined ? { sensitivity: input.sensitivity } : {}),
    ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
    ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
  }
}

function normalizePerceptionPolicy(policy: ValidatedPolicy | undefined): PerceptionPolicy {
  if (!policy) return {}
  return {
    ...(policy.allowedModalities !== undefined ? { allowedModalities: policy.allowedModalities } : {}),
    ...(policy.maximumInputs !== undefined ? { maximumInputs: policy.maximumInputs } : {}),
    ...(policy.maximumDurationSeconds !== undefined
      ? { maximumDurationSeconds: policy.maximumDurationSeconds }
      : {}),
    ...(policy.maximumSizeBytes !== undefined ? { maximumSizeBytes: policy.maximumSizeBytes } : {}),
    ...(policy.allowRestricted !== undefined ? { allowRestricted: policy.allowRestricted } : {}),
    ...(policy.requireApprovalForRestricted !== undefined
      ? { requireApprovalForRestricted: policy.requireApprovalForRestricted }
      : {}),
  }
}

export function validateBlackstarPerceptionRequest(input: unknown) {
  return inputSchema.parse(input)
}

export const planBlackstarMultimodalPerception = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateBlackstarPerceptionRequest)
  .handler(async ({ data }) => {
    return buildBlackstarPerceptionPlan(
      data.inputs.map(normalizePerceptionInput),
      normalizePerceptionPolicy(data.policy),
    )
  })
