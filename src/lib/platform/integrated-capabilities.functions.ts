import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { listIntegrationCapabilities } from '@/lib/integrations/agent-integration-runtime.server';

type Sb = { from: (table: string) => any };

const safeRef = z.string().trim().max(240).optional().nullable().refine((value) => !value || !/(?:api[_-]?key|secret|token|password)\s*[:=]/i.test(value), 'Store credentials in PalladiumAI Integrations, not capability records.');

export const getIntegratedCapabilityOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [sync, commerce, sessions, tracks, keyframes] = await Promise.all([
      sb.from('sync_connections').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(50),
      sb.from('commerce_workspaces').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(50),
      sb.from('remote_developer_sessions').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(50),
      sb.from('media_timeline_tracks').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(50),
      sb.from('media_timeline_keyframes').select('*').eq('user_id', context.userId).order('time_ms', { ascending: true }).limit(500),
    ]);
    for (const result of [sync, commerce, sessions, tracks, keyframes]) if (result.error) throw new Error(result.error.message);
    return { sync: sync.data ?? [], commerce: commerce.data ?? [], sessions: sessions.data ?? [], tracks: tracks.data ?? [], keyframes: keyframes.data ?? [] };
  });

export const saveSyncConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider: z.enum(['syncthing','integration','mcp']),
    name: z.string().trim().min(1).max(120),
    connectionRef: safeRef,
    localRoot: z.string().trim().min(1).max(500),
    remoteRoot: z.string().trim().min(1).max(500),
    direction: z.enum(['bidirectional','push','pull']),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('sync_connections').insert({ user_id: context.userId, provider: data.provider, name: data.name, connection_ref: data.connectionRef ?? null, local_root: data.localRoot, remote_root: data.remoteRoot, direction: data.direction, status: 'configured' }).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Sync mapping could not be saved.');
    await writeAudit({ userId: context.userId, action: 'sync.connection_created', targetType: 'sync_connection', targetId: result.data.id, metadata: { provider: data.provider, direction: data.direction } });
    return result.data;
  });

export const saveCommerceWorkspace = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider: z.enum(['shopify','medusa','integration','mcp']),
    name: z.string().trim().min(1).max(120),
    connectionRef: safeRef,
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('commerce_workspaces').insert({ user_id: context.userId, provider: data.provider, name: data.name, connection_ref: data.connectionRef ?? null, currency: data.currency, status: data.connectionRef ? 'connected' : 'needs_connection' }).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Commerce workspace could not be saved.');
    await writeAudit({ userId: context.userId, action: 'commerce.workspace_created', targetType: 'commerce_workspace', targetId: result.data.id, metadata: { provider: data.provider } });
    return result.data;
  });

export const getCommerceProviderCapabilities = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => listIntegrationCapabilities(context.userId, data.provider));

export const saveRemoteDeveloperSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    provider: z.enum(['palladium','happy','openhands']),
    label: z.string().trim().min(1).max(120),
    connectionRef: safeRef,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('remote_developer_sessions').insert({ user_id: context.userId, provider: data.provider, label: data.label, connection_ref: data.connectionRef ?? null, status: 'offline' }).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Remote developer session could not be saved.');
    await writeAudit({ userId: context.userId, action: 'developer.remote_session_created', targetType: 'remote_developer_session', targetId: result.data.id, metadata: { provider: data.provider } });
    return result.data;
  });

export const saveMediaTimelineTrack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(120), kind: z.enum(['value','camera','audio','event']), mediaJobId: z.string().uuid().optional().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from('media_timeline_tracks').insert({ user_id: context.userId, name: data.name, kind: data.kind, media_job_id: data.mediaJobId ?? null }).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Timeline track could not be saved.');
    await writeAudit({ userId: context.userId, action: 'media.timeline_track_created', targetType: 'media_timeline_track', targetId: result.data.id, metadata: { kind: data.kind } });
    return result.data;
  });

export const saveMediaTimelineKeyframe = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ trackId: z.string().uuid(), timeMs: z.number().int().min(0).max(86_400_000), value: z.record(z.string(), z.unknown()), interpolation: z.enum(['step','linear','smooth']) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const track = await sb.from('media_timeline_tracks').select('id').eq('id', data.trackId).eq('user_id', context.userId).maybeSingle();
    if (track.error) throw new Error(track.error.message);
    if (!track.data) throw new Error('Timeline track not found.');
    const result = await sb.from('media_timeline_keyframes').upsert({ user_id: context.userId, track_id: data.trackId, time_ms: data.timeMs, value: data.value, interpolation: data.interpolation }, { onConflict: 'track_id,time_ms' }).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Keyframe could not be saved.');
    await writeAudit({ userId: context.userId, action: 'media.timeline_keyframe_saved', targetType: 'media_timeline_keyframe', targetId: result.data.id, metadata: { trackId: data.trackId, timeMs: data.timeMs, interpolation: data.interpolation } });
    return result.data;
  });
