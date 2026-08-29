import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const uuid = z.string().uuid();
const safeProperties = z.record(z.string(), z.unknown()).default({});

async function requireProject(sb: Sb, projectId: string, userId: string) {
  const { data, error } = await sb.from('product_analytics_projects')
    .select('id,user_id,name,domain,write_key,currency,metadata,created_at,updated_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Analytics project not found or access denied.');
  return data;
}

function rangeStart(range: '7d' | '30d' | '90d') {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const listProductAnalyticsProjects = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('product_analytics_projects')
      .select('id,name,domain,write_key,currency,metadata,created_at,updated_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProductAnalyticsProject = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(160),
    domain: z.string().trim().max(500).nullish(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('product_analytics_projects').insert({
      user_id: context.userId,
      name: data.name,
      domain: data.domain || null,
      currency: data.currency,
    }).select('id,name,domain,write_key,currency,metadata,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: 'product_analytics.project_created', targetType: 'product_analytics_project', targetId: row.id, status: 'success' });
    return row;
  });

export const recordProductAnalyticsEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    visitorId: z.string().trim().max(240).nullish(),
    sessionId: z.string().trim().max(240).nullish(),
    eventName: z.string().trim().min(1).max(160),
    path: z.string().trim().max(2000).nullish(),
    referrer: z.string().trim().max(2000).nullish(),
    properties: safeProperties,
    revenueCents: z.number().int().min(0).max(9_000_000_000_000).default(0),
    occurredAt: z.string().datetime().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireProject(sb, data.projectId, context.userId);
    const { data: row, error } = await sb.from('product_analytics_events').insert({
      project_id: data.projectId,
      user_id: context.userId,
      visitor_id: data.visitorId || null,
      session_id: data.sessionId || null,
      event_name: data.eventName,
      path: data.path || null,
      referrer: data.referrer || null,
      properties: data.properties,
      revenue_cents: data.revenueCents,
      occurred_at: data.occurredAt ?? new Date().toISOString(),
    }).select('id,project_id,visitor_id,session_id,event_name,path,referrer,properties,revenue_cents,occurred_at').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getProductAnalyticsOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid, range: z.enum(['7d', '30d', '90d']).default('30d') }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProject(sb, data.projectId, context.userId);
    const since = rangeStart(data.range);
    const [eventsResult, funnelsResult, experimentsResult] = await Promise.all([
      sb.from('product_analytics_events')
        .select('id,visitor_id,session_id,event_name,path,referrer,properties,revenue_cents,occurred_at')
        .eq('project_id', data.projectId)
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(5000),
      sb.from('product_analytics_funnels').select('id,name,steps,created_at,updated_at').eq('project_id', data.projectId).order('created_at', { ascending: false }),
      sb.from('product_analytics_experiments').select('id,name,status,variants,goal_event,started_at,completed_at,created_at,updated_at').eq('project_id', data.projectId).order('created_at', { ascending: false }),
    ]);
    if (eventsResult.error) throw new Error(eventsResult.error.message);
    if (funnelsResult.error) throw new Error(funnelsResult.error.message);
    if (experimentsResult.error) throw new Error(experimentsResult.error.message);
    const events = eventsResult.data ?? [];
    const visitors = new Set<string>();
    const sessions = new Set<string>();
    const eventCounts = new Map<string, number>();
    let revenueCents = 0;
    for (const event of events) {
      if (typeof event.visitor_id === 'string' && event.visitor_id) visitors.add(event.visitor_id);
      if (typeof event.session_id === 'string' && event.session_id) sessions.add(event.session_id);
      const name = String(event.event_name ?? 'unknown');
      eventCounts.set(name, (eventCounts.get(name) ?? 0) + 1);
      revenueCents += Number(event.revenue_cents ?? 0);
    }
    const topEvents = [...eventCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    return {
      project,
      range: data.range,
      totals: { events: events.length, visitors: visitors.size, sessions: sessions.size, revenueCents },
      topEvents,
      recentEvents: events.slice(0, 100),
      funnels: funnelsResult.data ?? [],
      experiments: experimentsResult.data ?? [],
    };
  });

export const createProductFunnel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    name: z.string().trim().min(1).max(160),
    steps: z.array(z.string().trim().min(1).max(160)).min(2).max(12),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireProject(sb, data.projectId, context.userId);
    const { data: row, error } = await sb.from('product_analytics_funnels').insert({ user_id: context.userId, project_id: data.projectId, name: data.name, steps: data.steps }).select('id,name,steps,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createProductExperiment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    name: z.string().trim().min(1).max(160),
    goalEvent: z.string().trim().min(1).max(160),
    variants: z.array(z.string().trim().min(1).max(120)).min(2).max(12),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireProject(sb, data.projectId, context.userId);
    const { data: row, error } = await sb.from('product_analytics_experiments').insert({ user_id: context.userId, project_id: data.projectId, name: data.name, goal_event: data.goalEvent, variants: data.variants }).select('id,name,status,variants,goal_event,created_at,updated_at').single();
    if (error) throw new Error(error.message);
    return row;
  });
