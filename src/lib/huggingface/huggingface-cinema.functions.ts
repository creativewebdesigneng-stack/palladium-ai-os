import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'
import {
  generateHuggingFaceCinemaPreview,
  getHuggingFaceCinemaCapabilities,
  signHuggingFaceCinemaOutput,
} from './huggingface-cinema.server'

type Sb = { from: (table: string) => any }

const createInput = z.object({
  prompt: z.string().trim().min(10).max(4000),
  modelId: z.string().trim().max(240).optional(),
  numFrames: z.number().int().min(8).max(96).optional().default(48),
  seed: z.number().int().min(0).max(2147483647).optional(),
})

export const getHuggingFaceCinemaExecutionOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb
    const { data, error } = await sb.from('media_generation_jobs')
      .select('id,prompt,status,error_message,metadata,created_at,completed_at')
      .eq('user_id', context.userId)
      .eq('provider', 'huggingface_cinema')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw new Error(error.message)

    const jobs = await Promise.all((data ?? []).map(async (job: any) => {
      const objectPath = typeof job.metadata?.objectPath === 'string' ? job.metadata.objectPath : ''
      const outputUrl = objectPath && job.status === 'completed'
        ? await signHuggingFaceCinemaOutput(objectPath).catch(() => null)
        : null
      return { ...job, output_url: outputUrl }
    }))

    return { capabilities: getHuggingFaceCinemaCapabilities(), jobs }
  })

export const createHuggingFaceCinemaPreview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const capabilities = getHuggingFaceCinemaCapabilities()
    if (!capabilities.configured) throw new Error(capabilities.note)

    const created = await sb.from('media_generation_jobs')
      .insert({
        user_id: context.userId,
        provider: 'huggingface_cinema',
        kind: 'video',
        prompt: data.prompt,
        aspect_ratio: '16:9',
        duration_seconds: null,
        status: 'running',
        metadata: {
          modelId: data.modelId?.trim() || null,
          requestedFrames: data.numFrames,
          seed: data.seed ?? null,
          source: 'huggingface-dedicated-endpoint',
        },
      })
      .select('id')
      .single()
    if (created.error || !created.data?.id) throw new Error(created.error?.message ?? 'Could not create the Hugging Face Cinema job.')

    try {
      const result = await generateHuggingFaceCinemaPreview({
        userId: context.userId,
        jobId: created.data.id,
        prompt: data.prompt,
        ...(data.modelId ? { modelId: data.modelId } : {}),
        numFrames: data.numFrames,
        ...(data.seed !== undefined ? { seed: data.seed } : {}),
      })
      const now = new Date().toISOString()
      const updated = await sb.from('media_generation_jobs').update({
        status: 'completed',
        output_url: null,
        completed_at: now,
        updated_at: now,
        metadata: {
          modelId: data.modelId?.trim() || null,
          requestedFrames: data.numFrames,
          generatedFrames: result.numFrames,
          seed: data.seed ?? null,
          source: 'huggingface-dedicated-endpoint',
          objectPath: result.objectPath,
          contentType: result.contentType,
          bytes: result.bytes,
        },
      }).eq('id', created.data.id).eq('user_id', context.userId)
      if (updated.error) throw new Error(updated.error.message)

      await writeAudit({
        userId: context.userId,
        action: 'cinema.huggingface_preview.completed',
        targetType: 'media_generation_job',
        targetId: created.data.id,
        status: 'success',
        metadata: {
          provider: 'huggingface',
          modelId: data.modelId?.trim() || null,
          frames: result.numFrames,
          bytes: result.bytes,
        },
      })
      return { id: created.data.id, status: 'completed', outputUrl: result.signedUrl }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hugging Face Cinema preview failed.'
      const now = new Date().toISOString()
      await sb.from('media_generation_jobs').update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        completed_at: now,
        updated_at: now,
      }).eq('id', created.data.id).eq('user_id', context.userId)
      await writeAudit({
        userId: context.userId,
        action: 'cinema.huggingface_preview.failed',
        targetType: 'media_generation_job',
        targetId: created.data.id,
        status: 'failed',
        metadata: { provider: 'huggingface', reason: message.slice(0, 300) },
      }).catch(() => undefined)
      throw error
    }
  })
