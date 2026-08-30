import type { ToolDef } from '@/lib/runtime/model-gateway.server';
import { getShortVideoCapabilities, getShortVideoJob, submitShortVideoJob } from './short-video.server';

type ToolContext = { userId: string; sb: { from: (table: string) => any } };

export const SHORT_VIDEO_TOOL_DEF: ToolDef = {
  name: 'short_video',
  description: 'Create and inspect bounded automated short-video jobs through PalladiumAI Media Studio. Reuses existing Harness tool grants and execution audit; accepts no credentials or server paths.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['capabilities', 'list', 'create', 'status'] },
      script: { type: 'string', maxLength: 20000 },
      aspect_ratio: { type: 'string', enum: ['9:16', '16:9', '1:1'] },
      duration_seconds: { type: 'integer', enum: [15, 30, 45, 60, 90, 120, 180] },
      material_source: { type: 'string', enum: ['stock', 'generated', 'provided'] },
      source_urls: { type: 'array', items: { type: 'string' }, maxItems: 30 },
      voice: { type: 'string', maxLength: 120 },
      subtitles: { type: 'boolean' },
      subtitle_mode: { type: 'string', enum: ['sentence', 'word'] },
      background_music: { type: 'boolean' },
      transition: { type: 'string', enum: ['none', 'fade', 'slide'] },
      job_id: { type: 'string', description: 'PalladiumAI media-generation job UUID for status.' },
    },
    required: ['action'],
  },
};

function uuid(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('A valid short-video job id is required.');
  return id;
}

export async function runShortVideoTool(input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const action = typeof input['action'] === 'string' ? input['action'] : '';
  if (action === 'capabilities') return getShortVideoCapabilities();
  if (action === 'list') {
    const result = await ctx.sb.from('media_generation_jobs')
      .select('id,prompt,aspect_ratio,duration_seconds,status,worker_job_id,output_url,error_message,metadata,created_at,updated_at,completed_at')
      .eq('user_id', ctx.userId)
      .eq('provider', 'short_video')
      .order('created_at', { ascending: false })
      .limit(25);
    if (result.error) throw new Error(result.error.message);
    return { jobs: result.data ?? [] };
  }
  if (action === 'create') {
    const script = typeof input['script'] === 'string' ? input['script'].trim() : '';
    const aspectRatio = typeof input['aspect_ratio'] === 'string' ? input['aspect_ratio'] : '9:16';
    const durationSeconds = typeof input['duration_seconds'] === 'number' ? input['duration_seconds'] : 45;
    const materialSource = typeof input['material_source'] === 'string' ? input['material_source'] : 'stock';
    const sourceUrls = Array.isArray(input['source_urls']) ? input['source_urls'].filter((value): value is string => typeof value === 'string').slice(0, 30) : [];
    const voice = typeof input['voice'] === 'string' ? input['voice'].trim().slice(0, 120) : 'alloy';
    const subtitles = typeof input['subtitles'] === 'boolean' ? input['subtitles'] : true;
    const subtitleMode = typeof input['subtitle_mode'] === 'string' ? input['subtitle_mode'] : 'sentence';
    const backgroundMusic = typeof input['background_music'] === 'boolean' ? input['background_music'] : true;
    const transition = typeof input['transition'] === 'string' ? input['transition'] : 'fade';
    if (script.length < 10 || script.length > 20000) throw new Error('A bounded narration script between 10 and 20,000 characters is required.');
    if (!['9:16', '16:9', '1:1'].includes(aspectRatio)) throw new Error('Unsupported short-video aspect ratio.');
    if (![15,30,45,60,90,120,180].includes(durationSeconds)) throw new Error('Unsupported short-video duration.');
    if (!['stock','generated','provided'].includes(materialSource)) throw new Error('Unsupported media source.');
    if (!['sentence','word'].includes(subtitleMode)) throw new Error('Unsupported subtitle mode.');
    if (!['none','fade','slide'].includes(transition)) throw new Error('Unsupported transition.');

    const metadata = { materialSource, sourceUrls, voice, subtitles, subtitleMode, backgroundMusic, transition, initiatedBy: 'agent' };
    const created = await ctx.sb.from('media_generation_jobs').insert({
      user_id: ctx.userId,
      provider: 'short_video',
      kind: 'video',
      prompt: script,
      aspect_ratio: aspectRatio,
      duration_seconds: durationSeconds,
      status: 'queued',
      metadata,
    }).select('id').single();
    if (created.error) throw new Error(created.error.message);
    try {
      const worker = await submitShortVideoJob({
        script,
        aspectRatio,
        durationSeconds,
        materialSource: materialSource as 'stock' | 'generated' | 'provided',
        sourceUrls,
        voice,
        subtitles,
        subtitleMode: subtitleMode as 'sentence' | 'word',
        backgroundMusic,
        transition: transition as 'none' | 'fade' | 'slide',
      });
      const completedAt = ['completed','failed'].includes(worker.status) ? new Date().toISOString() : null;
      const updated = await ctx.sb.from('media_generation_jobs').update({
        worker_job_id: worker.workerJobId,
        status: worker.status,
        output_url: worker.outputUrl,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      }).eq('id', created.data.id).eq('user_id', ctx.userId);
      if (updated.error) throw new Error(updated.error.message);
      return { id: created.data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Short-video generation failed';
      await ctx.sb.from('media_generation_jobs').update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', created.data.id).eq('user_id', ctx.userId);
      throw error;
    }
  }
  if (action === 'status') {
    const id = uuid(input['job_id']);
    const job = await ctx.sb.from('media_generation_jobs')
      .select('id,worker_job_id,status,output_url,error_message,metadata')
      .eq('id', id)
      .eq('user_id', ctx.userId)
      .eq('provider', 'short_video')
      .maybeSingle();
    if (job.error) throw new Error(job.error.message);
    if (!job.data) throw new Error('Short-video job not found or access denied.');
    if (!job.data.worker_job_id || ['completed','failed'].includes(String(job.data.status))) return job.data;
    const worker = await getShortVideoJob(String(job.data.worker_job_id));
    const completedAt = ['completed','failed'].includes(worker.status) ? new Date().toISOString() : null;
    const metadata = { ...(job.data.metadata ?? {}), ...worker.metadata };
    const updated = await ctx.sb.from('media_generation_jobs').update({
      status: worker.status,
      output_url: worker.outputUrl,
      error_message: worker.errorMessage,
      metadata,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('user_id', ctx.userId);
    if (updated.error) throw new Error(updated.error.message);
    return { id, ...worker };
  }
  return { error: 'action must be capabilities, list, create or status.' };
}
