import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const task = z.enum(['text-to-video','image-to-video','text-to-3d','image-to-3d'])

export const discoverStudioHuggingFaceModels = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    task,
    limit: z.number().int().min(1).max(24).optional().default(12),
  }).parse(input))
  .handler(async ({ data }) => {
    const { discoverHuggingFaceStudioModels } = await import('./huggingface-studio.server')
    return discoverHuggingFaceStudioModels(data)
  })

export const inspectStudioHuggingFaceModel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    modelId: z.string().trim().min(3).max(240),
  }).parse(input))
  .handler(async ({ data }) => {
    const { getHuggingFaceStudioModelProviders } = await import('./huggingface-studio.server')
    return getHuggingFaceStudioModelProviders(data.modelId)
  })
