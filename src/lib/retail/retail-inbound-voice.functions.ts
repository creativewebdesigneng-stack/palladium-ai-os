import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { writeAudit } from '@/lib/platform/audit.server';
import {
  configureRetailTwilioIncomingNumber,
  detachRetailTwilioIncomingNumber,
  getRetailInboundVoiceRuntime,
  listRetailTwilioIncomingNumbers,
} from './retail-inbound-voice.server';

type Sb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as Sb;
const uuid = z.string().uuid();
const phoneSid = z.string().regex(/^PN[0-9a-fA-F]{32}$/);

async function requireWorkspace(sb: Sb, userId: string, workspaceId: string) {
  const { data, error } = await sb.from('retail_workspaces').select('id').eq('id', workspaceId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Retail workspace not found.');
}

async function requireProfile(sb: Sb, userId: string, workspaceId: string, profileId: string) {
  const { data, error } = await sb.from('retail_reception_profiles')
    .select('id,workspace_id,active')
    .eq('id', profileId).eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Retail receptionist profile not found.');
  if (!data.active) throw new Error('Retail receptionist profile must be active before connecting a phone number.');
}

export const getRetailInboundVoiceConfig = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireWorkspace(sb, context.userId, data.workspace_id);
    const [endpointsResult, sessionsResult] = await Promise.all([
      sb.from('retail_reception_voice_endpoints')
        .select('id,workspace_id,profile_id,provider,phone_number,provider_phone_sid,active,webhook_configured,last_verified_at,created_at,updated_at')
        .eq('workspace_id', data.workspace_id).order('updated_at', { ascending: false }),
      sb.from('retail_reception_voice_sessions')
        .select('id,workspace_id,profile_id,endpoint_id,call_id,provider,provider_call_sid,caller_phone,called_phone,status,turn_count,last_transcript,ended_at,created_at,updated_at')
        .eq('workspace_id', data.workspace_id).order('updated_at', { ascending: false }).limit(100),
    ]);
    if (endpointsResult.error) throw new Error(endpointsResult.error.message);
    if (sessionsResult.error) throw new Error(sessionsResult.error.message);

    const runtime = getRetailInboundVoiceRuntime();
    let availableNumbers: Array<{ sid: string; phone_number: string; friendly_name: string; voice_url: string; blocked_by_application: boolean }> = [];
    let providerError = '';
    if (runtime.configured) {
      try { availableNumbers = await listRetailTwilioIncomingNumbers(); }
      catch (error) { providerError = error instanceof Error ? error.message.slice(0, 500) : 'Twilio number lookup failed.'; }
    }

    return {
      runtime,
      endpoints: endpointsResult.data ?? [],
      sessions: sessionsResult.data ?? [],
      availableNumbers,
      providerError,
    };
  });

export const connectRetailInboundVoice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    workspace_id: uuid,
    profile_id: uuid,
    provider_phone_sid: phoneSid,
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireWorkspace(sb, context.userId, data.workspace_id);
    await requireProfile(sb, context.userId, data.workspace_id, data.profile_id);

    const verified = await configureRetailTwilioIncomingNumber(data.provider_phone_sid);
    const existingSid = await adminSb.from('retail_reception_voice_endpoints')
      .select('id,user_id,workspace_id,profile_id')
      .eq('provider', 'twilio').eq('provider_phone_sid', verified.sid).maybeSingle();
    if (existingSid.error) throw new Error(existingSid.error.message);
    if (existingSid.data && existingSid.data.user_id !== context.userId) throw new Error('This Twilio number is already bound to another Blackstar owner.');
    if (existingSid.data && existingSid.data.workspace_id !== data.workspace_id) throw new Error('This Twilio number is already bound to another Retail workspace.');

    const existingProfile = await adminSb.from('retail_reception_voice_endpoints')
      .select('id,user_id,provider_phone_sid')
      .eq('profile_id', data.profile_id).maybeSingle();
    if (existingProfile.error) throw new Error(existingProfile.error.message);
    if (existingProfile.data && existingProfile.data.user_id !== context.userId) throw new Error('Receptionist endpoint ownership mismatch.');

    const now = new Date().toISOString();
    const row = {
      user_id: context.userId,
      workspace_id: data.workspace_id,
      profile_id: data.profile_id,
      provider: 'twilio',
      phone_number: verified.phone_number,
      provider_phone_sid: verified.sid,
      active: true,
      webhook_configured: true,
      last_verified_at: now,
      metadata: { source: 'retail_inbound_voice_connect' },
      updated_at: now,
    };

    const targetId = existingSid.data?.id ?? existingProfile.data?.id ?? null;
    const saved = targetId
      ? await adminSb.from('retail_reception_voice_endpoints').update(row).eq('id', targetId).eq('user_id', context.userId).select('id,workspace_id,profile_id,phone_number,provider_phone_sid,active,webhook_configured,last_verified_at').single()
      : await adminSb.from('retail_reception_voice_endpoints').insert(row).select('id,workspace_id,profile_id,phone_number,provider_phone_sid,active,webhook_configured,last_verified_at').single();
    if (saved.error) throw new Error(saved.error.message);

    await writeAudit({
      userId: context.userId,
      action: 'retail.receptionist.phone_connect',
      targetType: 'retail_reception_profile',
      targetId: data.profile_id,
      status: 'success',
      metadata: { workspaceId: data.workspace_id, endpointId: saved.data.id, phoneNumber: verified.phone_number },
    });
    return saved.data;
  });

export const disconnectRetailInboundVoice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ endpoint_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const endpoint = await sb.from('retail_reception_voice_endpoints')
      .select('id,workspace_id,profile_id,provider_phone_sid,phone_number')
      .eq('id', data.endpoint_id).maybeSingle();
    if (endpoint.error) throw new Error(endpoint.error.message);
    if (!endpoint.data) throw new Error('Retail inbound voice endpoint not found.');

    let providerDetached = false;
    let providerError = '';
    try { providerDetached = await detachRetailTwilioIncomingNumber(endpoint.data.provider_phone_sid); }
    catch (error) { providerError = error instanceof Error ? error.message.slice(0, 500) : 'Twilio detach failed.'; }

    const now = new Date().toISOString();
    const updated = await adminSb.from('retail_reception_voice_endpoints').update({
      active: false,
      webhook_configured: false,
      updated_at: now,
      metadata: { source: 'retail_inbound_voice_disconnect', provider_detached: providerDetached, provider_error: providerError || null },
    }).eq('id', endpoint.data.id).eq('user_id', context.userId).select('id,active,webhook_configured').single();
    if (updated.error) throw new Error(updated.error.message);

    await writeAudit({
      userId: context.userId,
      action: 'retail.receptionist.phone_disconnect',
      targetType: 'retail_reception_profile',
      targetId: endpoint.data.profile_id,
      status: providerError ? 'failed' : 'success',
      metadata: { workspaceId: endpoint.data.workspace_id, endpointId: endpoint.data.id, providerDetached, providerError: providerError || null },
    });
    return { ...updated.data, providerDetached, providerError };
  });
