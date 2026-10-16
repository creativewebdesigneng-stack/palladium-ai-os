import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit, writeAuditRequired } from '@/lib/platform/audit.server';
import { getAutoEditorJob, getMediaRuntimeCapabilities, submitAutoEditorJob } from '@/lib/media/media-runtime.server';

type Sb = { from: (table: string) => any };
const outputFormat = z.enum(['mp4','mov','premiere','resolve','final-cut-pro','shotcut','kdenlive','clip-sequence']);

export const getMediaStudioOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('media_edit_jobs')
      .select('id,input_name,source_url,mode,threshold,margin_before_ms,margin_after_ms,output_format,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { capabilities: getMediaRuntimeCapabilities(), jobs: data ?? [] };
  });

export const createMediaEditJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    inputName: z.string().trim().min(1).max(240),
    sourceUrl: z.string().url().max(4000),
    mode: z.enum(['silence','motion']),
    threshold: z.number().min(0).max(1),
    marginBeforeMs: z.number().int().min(0).max(60000),
    marginAfterMs: z.number().int().min(0).max(60000),
    outputFormat,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const sb = supabaseAdmin as unknown as Sb;
    const { data: job, error: insertError } = await sb.from('media_edit_jobs').insert({
      user_id: context.userId,
      input_name: data.inputName,
      source_url: data.sourceUrl,
      mode: data.mode,
      threshold: data.threshold,
      margin_before_ms: data.marginBeforeMs,
      margin_after_ms: data.marginAfterMs,
      output_format: data.outputFormat,
      status: 'queued',
    }).select('id').single();
    if (insertError || !job?.id) throw new Error('Media job creation could not be confirmed.');
    try {
      await writeAuditRequired({userId:context.userId,action:'media_edit.submission_requested',targetType:'media_edit_job',targetId:job.id,metadata:{mode:data.mode,outputFormat:data.outputFormat}});
      const result = await submitAutoEditorJob(data);
      const completedAt = result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : null;
      const { data: receipt, error } = await sb.from('media_edit_jobs').update({ worker_job_id: result.workerJobId, status: result.status, output_url: result.outputUrl, completed_at: completedAt, updated_at: new Date().toISOString() }).eq('id', job.id).eq('user_id',context.userId).select('id').maybeSingle();
      if (error || !receipt) throw new Error('Media worker receipt could not be persisted. Do not resubmit automatically.');
      await writeAudit({ userId: context.userId, orgId: null, action: 'media_edit.submitted', targetType: 'media_edit_job', targetId: job.id, status: 'success', metadata: { mode: data.mode, outputFormat: data.outputFormat } });
      return { id: job.id, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Media edit submission failed';
      await sb.from('media_edit_jobs').update({ status: 'failed', error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id).eq('user_id',context.userId);
      throw error;
    }
  });

export const refreshMediaEditJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: job, error } = await sb.from('media_edit_jobs').select('id,worker_job_id,status').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error('Media job not found or access denied.');
    if (!job.worker_job_id) throw new Error('This media job was not accepted by the worker.');
    const result = await getAutoEditorJob(job.worker_job_id);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const admin = supabaseAdmin as unknown as Sb;
    const completedAt = result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : null;
    const { data: receipt,error: updateError } = await admin.from('media_edit_jobs').update({ status: result.status, output_url: result.outputUrl, error_message: result.errorMessage, metadata: result.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq('id', data.id).eq('user_id', context.userId).eq('worker_job_id',job.worker_job_id).select('id').maybeSingle();
    if (updateError || !receipt) throw new Error('Media status update could not be confirmed.');
    return { id: data.id, ...result };
  });
