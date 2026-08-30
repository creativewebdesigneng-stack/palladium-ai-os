import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server';
import { runChat, type ChatMessage } from '@/lib/runtime/model-gateway.server';
import { writeAudit } from '@/lib/platform/audit.server';
import { getShortVideoCapabilities, getShortVideoJob, submitShortVideoJob } from './short-video.server';

type Sb = { from: (table: string) => any };

const materialSource = z.enum(['stock', 'generated', 'provided']);
const subtitleMode = z.enum(['sentence', 'word']);
const transition = z.enum(['none', 'fade', 'slide']);

export const getShortVideoOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('media_generation_jobs')
      .select('id,provider,kind,prompt,aspect_ratio,duration_seconds,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at')
      .eq('user_id', context.userId)
      .eq('provider', 'short_video')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { capability: getShortVideoCapabilities(), jobs: data ?? [] };
  });

export const planShortVideoScript = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    topic: z.string().trim().min(3).max(2000),
    durationSeconds: z.number().int().min(15).max(180),
    style: z.string().trim().max(500).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const preferenceResult = await sb.from('user_ai_preferences')
      .select('default_provider,default_model')
      .eq('user_id', context.userId)
      .maybeSingle();
    const preference = preferenceResult.error ? null : preferenceResult.data;
    const { provider, model } = resolveAssistantModelPreference(preference);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are PalladiumAI Short Video Planner. Write a production-ready narration script for a short social video. Return only the spoken script, with concise natural sentences, a strong opening hook, useful body, and clear ending. Do not include camera directions, markdown headings, shot labels, or invented citations.',
      },
      {
        role: 'user',
        content: `Topic: ${data.topic}\nTarget duration: ${data.durationSeconds} seconds\nStyle: ${data.style || 'clear, engaging, modern social video'}`,
      },
    ];
    const result = await runChat({ provider, model, messages, maxTokens: 1400 });
    const script = result.text.trim();
    if (!script) throw new Error('The model returned an empty short-video script.');
    await writeAudit({
      userId: context.userId,
      action: 'short_video.script_planned',
      targetType: 'media_generation_job',
      status: 'success',
      metadata: { provider: result.provider, model: result.model, durationSeconds: data.durationSeconds },
    });
    return { script, provider: result.provider, model: result.model };
  });

export const createShortVideoJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    script: z.string().trim().min(10).max(20_000),
    aspectRatio: z.enum(['9:16', '16:9', '1:1']),
    durationSeconds: z.number().int().min(15).max(180),
    materialSource,
    sourceUrls: z.array(z.string().url().max(4000)).max(30).default([]),
    voice: z.string().trim().min(1).max(120),
    subtitles: z.boolean(),
    subtitleMode,
    backgroundMusic: z.boolean(),
    transition,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const metadata = {
      materialSource: data.materialSource,
      sourceUrls: data.sourceUrls,
      voice: data.voice,
      subtitles: data.subtitles,
      subtitleMode: data.subtitleMode,
      backgroundMusic: data.backgroundMusic,
      transition: data.transition,
    };
    const { data: row, error: insertError } = await sb.from('media_generation_jobs').insert({
      user_id: context.userId,
      provider: 'short_video',
      kind: 'video',
      prompt: data.script,
      aspect_ratio: data.aspectRatio,
      duration_seconds: data.durationSeconds,
      status: 'queued',
      metadata,
    }).select('id').single();
    if (insertError) throw new Error(insertError.message);

    try {
      const result = await submitShortVideoJob(data);
      const completedAt = ['completed', 'failed'].includes(result.status) ? new Date().toISOString() : null;
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
        action: 'short_video.submitted',
        targetType: 'media_generation_job',
        targetId: row.id,
        status: 'success',
        metadata: { aspectRatio: data.aspectRatio, durationSeconds: data.durationSeconds, materialSource: data.materialSource },
      });
      return { id: row.id, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Short-video submission failed';
      await sb.from('media_generation_jobs').update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', row.id).eq('user_id', context.userId);
      throw error;
    }
  });

export const refreshShortVideoJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const lookup = await sb.from('media_generation_jobs')
      .select('id,worker_job_id')
      .eq('id', data.id)
      .eq('user_id', context.userId)
      .eq('provider', 'short_video')
      .maybeSingle();
    if (lookup.error) throw new Error(lookup.error.message);
    if (!lookup.data) throw new Error('Short-video job not found or access denied.');
    if (!lookup.data.worker_job_id) throw new Error('This short-video job was not accepted by the worker.');
    const result = await getShortVideoJob(lookup.data.worker_job_id);
    const completedAt = ['completed', 'failed'].includes(result.status) ? new Date().toISOString() : null;
    const existing = await sb.from('media_generation_jobs').select('metadata').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    const metadata = { ...(existing.data?.metadata ?? {}), ...result.metadata };
    const update = await sb.from('media_generation_jobs').update({
      status: result.status,
      output_url: result.outputUrl,
      error_message: result.errorMessage,
      metadata,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id).eq('user_id', context.userId);
    if (update.error) throw new Error(update.error.message);
    return { id: data.id, ...result };
  });
