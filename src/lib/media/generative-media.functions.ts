import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { getGenerativeMediaCapabilities, getGenerativeMediaJob, submitGenerativeMediaJob } from './generative-media.server';

type Sb = { from: (table: string) => any };
const provider = z.enum(['seedream', 'ltx']);

export const getGenerativeMediaOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('media_generation_jobs')
      .select('id,provider,kind,prompt,aspect_ratio,source_url,duration_seconds,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at')
      .eq('user_id', context.userId)
      .in('provider', ['seedream', 'ltx'])
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { capabilities: getGenerativeMediaCapabilities(), jobs: data ?? [] };
  });

export const createGenerativeMediaJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider,
    prompt: z.string().trim().min(1).max(12_000),
    aspectRatio: z.string().trim().min(3).max(20),
    sourceUrl: z.string().url().max(4000).nullish(),
    durationSeconds: z.number().int().min(1).max(30).nullish(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const kind = data.provider === 'seedream' ? 'image' : 'video';
    const { data: row, error: insertError } = await sb.from('media_generation_jobs').insert({
      user_id: context.userId,
      provider: data.provider,
      kind,
      prompt: data.prompt,
      aspect_ratio: data.aspectRatio,
      source_url: data.sourceUrl ?? null,
      duration_seconds: data.provider === 'ltx' ? data.durationSeconds ?? 5 : null,
      status: 'queued',
      metadata: {},
    }).select('id').single();
    if (insertError) throw new Error(insertError.message);

    try {
      const result = await submitGenerativeMediaJob({
        provider: data.provider,
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        sourceUrl: data.sourceUrl ?? null,
        durationSeconds: data.durationSeconds ?? null,
      });
      const completedAt = result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : null;
      const update = await sb.from('media_generation_jobs').update({
        worker_job_id: result.workerJobId,
        status: result.status,
        output_url: result.outputUrl,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id).eq('user_id', context.userId);
      if (update.error) throw new Error(update.error.message);
      await writeAudit({
        userId: context.userId,
        action: 'media_generation.submitted',
        targetType: 'media_generation_job',
        targetId: row.id,
        status: 'success',
        metadata: { provider: data.provider, kind, aspectRatio: data.aspectRatio },
      });
      return { id: row.id, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Media generation submission failed';
      await sb.from('media_generation_jobs').update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', row.id).eq('user_id', context.userId);
      throw error;
    }
  });

export const refreshGenerativeMediaJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const lookup = await sb.from('media_generation_jobs')
      .select('id,provider,worker_job_id')
      .eq('id', data.id)
      .eq('user_id', context.userId)
      .in('provider', ['seedream', 'ltx'])
      .maybeSingle();
    if (lookup.error) throw new Error(lookup.error.message);
    if (!lookup.data) throw new Error('Generation job not found or access denied.');
    if (!lookup.data.worker_job_id) throw new Error('This generation job was not accepted by the worker.');
    const providerId = provider.parse(lookup.data.provider);
    const result = await getGenerativeMediaJob(providerId, lookup.data.worker_job_id);
    const completedAt = result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : null;
    const update = await sb.from('media_generation_jobs').update({
      status: result.status,
      output_url: result.outputUrl,
      error_message: result.errorMessage,
      metadata: result.metadata,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id).eq('user_id', context.userId);
    if (update.error) throw new Error(update.error.message);
    return { id: data.id, ...result };
  });
