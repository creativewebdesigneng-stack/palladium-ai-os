import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { runWebAutomation, getWebAutomationCapabilities } from './web-intelligence.server';
import { assertPublicHttpUrl } from './url-policy';

type Sb = { from: (table: string) => any };

const providerSchema = z.enum(['firecrawl', 'crawlee']);
const operationSchema = z.enum(['search', 'scrape', 'crawl']);

export const getWebIntelligenceOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('web_crawl_jobs').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return { capabilities: getWebAutomationCapabilities(), jobs: data ?? [] };
  });

export const createWebIntelligenceJob = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = z.object({
      provider: providerSchema,
      operation: operationSchema,
      source: z.string().trim().min(2).max(2048),
      limit: z.number().int().min(1).max(50).optional(),
    }).parse(input);
    if (parsed.provider === 'crawlee' && parsed.operation === 'search') throw new Error('Crawlee jobs support scrape or crawl.');
    if (parsed.operation !== 'search') assertPublicHttpUrl(parsed.source, 'Target');
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const inserted = await sb.from('web_crawl_jobs').insert({
      user_id: context.userId,
      provider: data.provider,
      operation: data.operation,
      source: data.source,
      status: 'queued',
    }).select('*').maybeSingle();
    if (inserted.error) throw new Error(inserted.error.message);
    if (!inserted.data) throw new Error('The web job could not be created.');

    try {
      const execution = await runWebAutomation(data);
      const update = await sb.from('web_crawl_jobs').update({
        provider_job_id: execution.providerJobId,
        status: execution.status,
        result: execution.result,
        error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', inserted.data.id).eq('user_id', context.userId).select('*').maybeSingle();
      if (update.error) throw new Error(update.error.message);
      await writeAudit({ userId: context.userId, action: 'web_intelligence.job_created', targetType: 'web_crawl_job', targetId: inserted.data.id, metadata: { provider: data.provider, operation: data.operation } });
      return update.data ?? inserted.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Web automation failed.';
      await sb.from('web_crawl_jobs').update({ status: 'failed', error: message, updated_at: new Date().toISOString() }).eq('id', inserted.data.id).eq('user_id', context.userId);
      throw error;
    }
  });
