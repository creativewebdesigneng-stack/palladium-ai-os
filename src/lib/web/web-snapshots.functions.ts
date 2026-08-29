import { createHash } from 'node:crypto';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { assertPublicHttpUrl } from './url-policy';

type Sb = { from: (table: string) => any };

export const listWebIntelligenceSnapshots = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('web_intelligence_snapshots').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  });

export const snapshotWebIntelligenceJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid(), selectors: z.object({ include: z.array(z.string().max(180)).max(20).optional(), exclude: z.array(z.string().max(180)).max(20).optional() }).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const job = await sb.from('web_crawl_jobs').select('id,operation,source,status,result').eq('id', data.jobId).eq('user_id', context.userId).maybeSingle();
    if (job.error) throw new Error(job.error.message);
    if (!job.data) throw new Error('Web Intelligence job not found.');
    if (job.data.operation === 'search') throw new Error('Snapshots are available for scrape and crawl targets, not search queries.');
    if (job.data.status !== 'completed') throw new Error('Only completed web jobs can be snapshotted.');
    assertPublicHttpUrl(String(job.data.source), 'Snapshot target');
    const serialized = JSON.stringify(job.data.result ?? null);
    const contentHash = createHash('sha256').update(serialized).digest('hex');
    const excerpt = serialized.slice(0, 1200);
    const inserted = await sb.from('web_intelligence_snapshots').insert({ user_id: context.userId, source_url: job.data.source, content_hash: contentHash, excerpt, selectors: data.selectors ?? {} }).select('*').maybeSingle();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Snapshot could not be saved.');
    const previous = await sb.from('web_intelligence_snapshots').select('id,content_hash,created_at').eq('user_id', context.userId).eq('source_url', job.data.source).neq('id', inserted.data.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const changed = Boolean(previous.data && previous.data.content_hash !== contentHash);
    await writeAudit({ userId: context.userId, action: 'web_intelligence.snapshot_created', targetType: 'web_intelligence_snapshot', targetId: inserted.data.id, metadata: { jobId: data.jobId, changed } });
    return { snapshot: inserted.data, changed, previous: previous.data ?? null };
  });
