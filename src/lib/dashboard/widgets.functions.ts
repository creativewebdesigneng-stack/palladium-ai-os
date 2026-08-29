import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };
const widgetKind = z.enum(['link','status','metric','note']);
const urlSchema = z.string().trim().max(4000).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}, 'Use a valid HTTP or HTTPS URL.');

export const listDashboardWidgets = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('dashboard_widgets')
      .select('id,title,kind,target_url,config,sort_order,enabled,created_at,updated_at')
      .eq('user_id', context.userId)
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDashboardWidget = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    kind: widgetKind,
    targetUrl: urlSchema.nullish(),
    value: z.string().trim().max(1000).nullish(),
    description: z.string().trim().max(2000).nullish(),
    sortOrder: z.number().int().min(-10000).max(10000).default(0),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const payload = {
      user_id: context.userId,
      title: data.title,
      kind: data.kind,
      target_url: data.targetUrl || null,
      config: { value: data.value ?? null, description: data.description ?? null },
      sort_order: data.sortOrder,
      enabled: true,
      updated_at: new Date().toISOString(),
    };
    let query;
    if (data.id) query = sb.from('dashboard_widgets').update(payload).eq('id', data.id).eq('user_id', context.userId);
    else query = sb.from('dashboard_widgets').insert(payload);
    const { data: row, error } = await query.select('id,title,kind,target_url,config,sort_order,enabled,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: data.id ? 'dashboard_widget.updated' : 'dashboard_widget.created', targetType: 'dashboard_widget', targetId: row.id, status: 'success' });
    return row;
  });

export const deleteDashboardWidget = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('dashboard_widgets').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: 'dashboard_widget.deleted', targetType: 'dashboard_widget', targetId: data.id, status: 'success' });
    return { id: data.id };
  });
