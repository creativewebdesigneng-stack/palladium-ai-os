import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const topicSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/);
function baseUrl() { return (process.env['NTFY_BASE_URL']?.trim() || 'https://ntfy.sh').replace(/\/+$/, ''); }
function token() { return process.env['NTFY_TOKEN']?.trim() || null; }

export const getNtfyOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('notification_endpoints').select('*').eq('user_id', context.userId).eq('provider', 'ntfy').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { configured: Boolean(process.env['NTFY_BASE_URL']?.trim() || process.env['NTFY_TOKEN']?.trim()), baseUrl: baseUrl(), endpoints: data ?? [] };
  });

export const saveNtfyEndpoint = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ label: z.string().trim().min(1).max(80), topic: topicSchema, enabled: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('notification_endpoints').upsert({ user_id: context.userId, provider: 'ntfy', label: data.label, topic: data.topic, enabled: data.enabled ?? true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider,topic' }).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error('Push endpoint could not be saved.');
    await writeAudit({ userId: context.userId, action: 'notifications.ntfy_endpoint_saved', targetType: 'notification_endpoint', targetId: row.id });
    return row;
  });

export const sendNtfyTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const found = await sb.from('notification_endpoints').select('*').eq('id', data.id).eq('user_id', context.userId).eq('provider', 'ntfy').maybeSingle();
    if (found.error) throw new Error(found.error.message);
    if (!found.data || !found.data.enabled) throw new Error('Enabled ntfy endpoint not found.');
    const auth = token();
    const response = await fetch(`${baseUrl()}/${encodeURIComponent(found.data.topic)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Title': 'PalladiumAI test notification', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: 'Your PalladiumAI push notification endpoint is working.',
    });
    if (!response.ok) throw new Error(`ntfy rejected the notification (${response.status}).`);
    await writeAudit({ userId: context.userId, action: 'notifications.ntfy_test_sent', targetType: 'notification_endpoint', targetId: data.id });
    return { ok: true };
  });
