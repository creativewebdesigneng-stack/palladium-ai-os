import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { getLuxTtsCapabilities, synthesizeLuxTts } from './lux-tts.server';

type Sb = { from: (table: string) => any };
const mimeType = z.enum(['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/aac','audio/flac']);

export const getLuxTtsOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('voice_clone_jobs')
      .select('id,provider,text,reference_filename,reference_mime_type,speed,steps,status,duration_ms,output_bytes,error_message,created_at,completed_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (result.error) throw new Error(result.error.message);
    return { capability: getLuxTtsCapabilities(), jobs: result.data ?? [] };
  });

export const synthesizeLuxVoice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    text: z.string().trim().min(1).max(4096),
    referenceAudioBase64: z.string().min(1).max(45_000_000),
    referenceFilename: z.string().trim().min(1).max(240),
    referenceMimeType: mimeType,
    speed: z.number().min(0.5).max(2).default(1),
    steps: z.number().int().min(1).max(12).default(4),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const started = Date.now();
    const inserted = await sb.from('voice_clone_jobs').insert({
      user_id: context.userId,
      provider: 'luxtts',
      text: data.text,
      reference_filename: data.referenceFilename,
      reference_mime_type: data.referenceMimeType,
      speed: data.speed,
      steps: data.steps,
      status: 'running',
    }).select('id').single();
    if (inserted.error) throw new Error(inserted.error.message);
    try {
      const audio = await synthesizeLuxTts(data);
      const durationMs = Date.now() - started;
      const updated = await sb.from('voice_clone_jobs').update({
        status: 'completed',
        duration_ms: durationMs,
        output_bytes: audio.bytes,
        completed_at: new Date().toISOString(),
      }).eq('id', inserted.data.id).eq('user_id', context.userId);
      if (updated.error) throw new Error(updated.error.message);
      await writeAudit({
        userId: context.userId,
        action: 'voice_luxtts_completed',
        targetType: 'voice_clone_job',
        targetId: inserted.data.id,
        status: 'success',
        metadata: { provider: 'luxtts', bytes: audio.bytes, speed: data.speed, steps: data.steps },
      });
      return { jobId: inserted.data.id, audioBase64: audio.base64, contentType: audio.contentType, durationMs };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LuxTTS synthesis failed';
      await sb.from('voice_clone_jobs').update({
        status: 'failed',
        duration_ms: Date.now() - started,
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
      }).eq('id', inserted.data.id).eq('user_id', context.userId);
      throw error;
    }
  });
