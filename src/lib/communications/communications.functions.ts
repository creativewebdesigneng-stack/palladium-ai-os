import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { writeAudit } from '@/lib/platform/audit.server';
import {
  communicationPreferencesSchema,
  DEFAULT_COMMUNICATION_PREFERENCES,
  isInsideQuietHours,
  purposeEnabled,
  saveRecipientSchema,
  sendSmsSchema,
  startAiCallSchema,
  type CommunicationPreferences,
  type CommunicationPurpose,
} from './contracts';
import {
  checkPhoneVerification,
  communicationsPublicUrl,
  communicationsRuntimeCapabilities,
  sendTwilioSms,
  startPhoneVerification,
  startTwilioAiCall,
} from './twilio-provider.server';

type Sb = { from: (table: string) => any };
const admin = supabaseAdmin as unknown as Sb;

function preferencesFromRow(row: any): CommunicationPreferences {
  if (!row) return DEFAULT_COMMUNICATION_PREFERENCES;
  return communicationPreferencesSchema.parse({
    phone_push_enabled: row.phone_push_enabled ?? true,
    sms_enabled: row.sms_enabled ?? false,
    ai_calls_enabled: row.ai_calls_enabled ?? false,
    project_updates: row.project_updates ?? true,
    agent_updates: row.agent_updates ?? true,
    business_updates: row.business_updates ?? true,
    quiet_hours_start: row.quiet_hours_start ? String(row.quiet_hours_start).slice(0, 5) : null,
    quiet_hours_end: row.quiet_hours_end ? String(row.quiet_hours_end).slice(0, 5) : null,
    timezone: row.timezone ?? 'UTC',
    max_daily_sms: Number(row.max_daily_sms ?? 10),
    max_daily_calls: Number(row.max_daily_calls ?? 3),
    retain_call_transcript: row.retain_call_transcript ?? false,
  });
}

async function loadPreferences(userId: string) {
  const { data, error } = await admin.from('communication_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return preferencesFromRow(data);
}

async function loadRecipient(userId: string, recipientId: string) {
  const { data, error } = await admin.from('communication_recipients')
    .select('*').eq('id', recipientId).eq('user_id', userId).is('disabled_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Active phone recipient not found.');
  return data;
}

async function assertChannelAllowed(input: {
  userId: string;
  channel: 'sms' | 'voice';
  purpose: CommunicationPurpose;
}) {
  const prefs = await loadPreferences(input.userId);
  if (input.channel === 'sms' && !prefs.sms_enabled) throw new Error('SMS delivery is disabled in Phone & Voice preferences.');
  if (input.channel === 'voice' && !prefs.ai_calls_enabled) throw new Error('AI phone calls are disabled in Phone & Voice preferences.');
  if (!purposeEnabled(prefs, input.purpose)) throw new Error('This update category is disabled in Phone & Voice preferences.');
  if (isInsideQuietHours(new Date(), prefs.timezone, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
    throw new Error('Phone communications are paused during your configured quiet hours.');
  }
  return prefs;
}

async function assertDailyLimit(userId: string, channel: 'sms' | 'voice', limit: number) {
  if (limit <= 0) throw new Error(`${channel === 'sms' ? 'SMS' : 'AI call'} daily limit is set to zero.`);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin.from('communication_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', channel)
    .gte('created_at', since)
    .neq('status', 'cancelled');
  if (error) throw new Error(error.message);
  if (Number(count ?? 0) >= limit) throw new Error(`${channel === 'sms' ? 'SMS' : 'AI call'} daily limit reached.`);
}

export const getCommunicationsOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [prefs, recipients, events, endpoints] = await Promise.all([
      loadPreferences(context.userId),
      admin.from('communication_recipients').select('id,label,phone_e164,verified_at,sms_consent_at,voice_consent_at,disabled_at,created_at').eq('user_id', context.userId).order('created_at', { ascending: false }),
      admin.from('communication_events').select('id,recipient_id,channel,purpose,status,provider,provider_id,title,body,call_objective,error,created_at,delivered_at,completed_at').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(30),
      admin.from('notification_endpoints').select('id,provider,label,enabled,created_at').eq('user_id', context.userId).eq('provider', 'ntfy').eq('enabled', true),
    ]);
    if (recipients.error) throw new Error(recipients.error.message);
    if (events.error) throw new Error(events.error.message);
    if (endpoints.error) throw new Error(endpoints.error.message);
    return {
      capabilities: communicationsRuntimeCapabilities(),
      preferences: prefs,
      recipients: recipients.data ?? [],
      recent_events: events.data ?? [],
      phone_push_endpoints: endpoints.data ?? [],
    };
  });

export const saveCommunicationPreferences = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => communicationPreferencesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = { user_id: context.userId, ...data, updated_at: new Date().toISOString() };
    const { error } = await admin.from('communication_preferences').upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, action: 'communications.preferences_updated', targetType: 'communication_preferences', targetId: context.userId });
    return data;
  });

export const saveCommunicationRecipient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveRecipientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const existing = await admin.from('communication_recipients').select('*')
      .eq('user_id', context.userId).eq('phone_e164', data.phone_e164).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const row = {
      user_id: context.userId,
      label: data.label,
      phone_e164: data.phone_e164,
      sms_consent_at: data.sms_consent ? (existing.data?.sms_consent_at ?? now) : null,
      voice_consent_at: data.voice_consent ? (existing.data?.voice_consent_at ?? now) : null,
      disabled_at: null,
      updated_at: now,
    };
    const result = await admin.from('communication_recipients').upsert(row, { onConflict: 'user_id,phone_e164' }).select('*').single();
    if (result.error || !result.data) throw new Error(result.error?.message || 'Phone recipient could not be saved.');
    await writeAudit({ userId: context.userId, action: 'communications.recipient_saved', targetType: 'communication_recipient', targetId: result.data.id, metadata: { smsConsent: data.sms_consent, voiceConsent: data.voice_consent, verified: Boolean(result.data.verified_at) } });
    return result.data;
  });

export const beginCommunicationPhoneVerification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ recipient_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const recipient = await loadRecipient(context.userId, data.recipient_id);
    const result = await startPhoneVerification(recipient.phone_e164);
    await writeAudit({ userId: context.userId, action: 'communications.phone_verification_started', targetType: 'communication_recipient', targetId: recipient.id });
    return result;
  });

export const confirmCommunicationPhoneVerification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ recipient_id: z.string().uuid(), code: z.string().trim().regex(/^\d{4,10}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const recipient = await loadRecipient(context.userId, data.recipient_id);
    const approved = await checkPhoneVerification(recipient.phone_e164, data.code);
    if (!approved) throw new Error('The phone verification code was not approved.');
    const now = new Date().toISOString();
    const result = await admin.from('communication_recipients').update({ verified_at: now, updated_at: now })
      .eq('id', recipient.id).eq('user_id', context.userId).select('*').single();
    if (result.error || !result.data) throw new Error(result.error?.message || 'Phone verification state could not be saved.');
    await writeAudit({ userId: context.userId, action: 'communications.phone_verified', targetType: 'communication_recipient', targetId: recipient.id, status: 'success' });
    return result.data;
  });

export const sendCommunicationSms = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendSmsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [prefs, recipient] = await Promise.all([
      assertChannelAllowed({ userId: context.userId, channel: 'sms', purpose: data.purpose }),
      loadRecipient(context.userId, data.recipient_id),
    ]);
    if (!recipient.verified_at) throw new Error('Verify this phone number before Blackstar sends SMS messages.');
    if (!recipient.sms_consent_at) throw new Error('SMS consent is required for this phone number.');
    await assertDailyLimit(context.userId, 'sms', prefs.max_daily_sms);

    const now = new Date().toISOString();
    const inserted = await admin.from('communication_events').insert({
      user_id: context.userId,
      recipient_id: recipient.id,
      channel: 'sms',
      purpose: data.purpose,
      source_type: data.source_type ?? 'user',
      source_id: data.source_id ?? null,
      body: data.body,
      status: 'sending',
      provider: 'twilio',
      metadata: { initiated_by: 'authenticated_user' },
    }).select('*').single();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message || 'Communication event could not be created.');
    const event = inserted.data;

    try {
      const statusCallbackUrl = communicationsPublicUrl('/api/public/communications/twilio/message-status');
      const provider = await sendTwilioSms({ to: recipient.phone_e164, body: data.body, statusCallbackUrl });
      const acceptedAt = new Date().toISOString();
      await admin.from('communication_events').update({
        status: 'sent', provider_id: provider.sid, sent_at: acceptedAt, updated_at: acceptedAt,
        metadata: { initiated_by: 'authenticated_user', provider_status: provider.status },
      }).eq('id', event.id).eq('status', 'sending');
      await writeAudit({ userId: context.userId, action: 'communications.sms_sent', targetType: 'communication_event', targetId: event.id, status: 'success', metadata: { purpose: data.purpose, provider: 'twilio' } });
      return { event_id: event.id, status: 'sent', provider_status: provider.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMS delivery failed.';
      await admin.from('communication_events').update({ status: 'failed', error: message.slice(0, 1000), updated_at: now }).eq('id', event.id).eq('status', 'sending');
      await writeAudit({ userId: context.userId, action: 'communications.sms_sent', targetType: 'communication_event', targetId: event.id, status: 'failed', metadata: { purpose: data.purpose, error: message.slice(0, 500) } });
      throw error;
    }
  });

export const startCommunicationAiCall = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startAiCallSchema.parse(input))
  .handler(async ({ data, context }) => {
    const [prefs, recipient] = await Promise.all([
      assertChannelAllowed({ userId: context.userId, channel: 'voice', purpose: data.purpose }),
      loadRecipient(context.userId, data.recipient_id),
    ]);
    if (!recipient.verified_at) throw new Error('Verify this phone number before Blackstar starts an AI call.');
    if (!recipient.voice_consent_at) throw new Error('AI voice-call consent is required for this phone number.');
    await assertDailyLimit(context.userId, 'voice', prefs.max_daily_calls);

    const eventResult = await admin.from('communication_events').insert({
      user_id: context.userId,
      recipient_id: recipient.id,
      channel: 'voice',
      purpose: data.purpose,
      source_type: data.source_type ?? 'user',
      source_id: data.source_id ?? null,
      call_objective: data.objective,
      status: 'queued',
      provider: 'twilio',
      metadata: { initiated_by: 'authenticated_user', ai_disclosure_required: true },
    }).select('*').single();
    if (eventResult.error || !eventResult.data) throw new Error(eventResult.error?.message || 'Call event could not be created.');
    const event = eventResult.data;

    const sessionResult = await admin.from('communication_call_sessions').insert({
      event_id: event.id,
      user_id: context.userId,
      provider: 'twilio',
      status: 'queued',
      call_objective: data.objective,
      retain_transcript: prefs.retain_call_transcript,
      history: [],
    }).select('*').single();
    if (sessionResult.error || !sessionResult.data) {
      await admin.from('communication_events').update({ status: 'failed', error: sessionResult.error?.message ?? 'Call session could not be created.' }).eq('id', event.id);
      throw new Error(sessionResult.error?.message || 'Call session could not be created.');
    }
    const session = sessionResult.data;

    try {
      const provider = await startTwilioAiCall({ to: recipient.phone_e164, sessionId: session.id });
      const now = new Date().toISOString();
      await Promise.all([
        admin.from('communication_call_sessions').update({ provider_call_sid: provider.sid, status: 'queued', updated_at: now }).eq('id', session.id).is('provider_call_sid', null),
        admin.from('communication_events').update({ provider_id: provider.sid, status: 'queued', updated_at: now, metadata: { initiated_by: 'authenticated_user', ai_disclosure_required: true, provider_status: provider.status } }).eq('id', event.id),
      ]);
      await writeAudit({ userId: context.userId, action: 'communications.ai_call_started', targetType: 'communication_event', targetId: event.id, status: 'success', metadata: { purpose: data.purpose, provider: 'twilio' } });
      return { event_id: event.id, session_id: session.id, status: provider.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI call could not be started.';
      const now = new Date().toISOString();
      await Promise.all([
        admin.from('communication_call_sessions').update({ status: 'failed', ended_at: now, updated_at: now, history: [] }).eq('id', session.id),
        admin.from('communication_events').update({ status: 'failed', error: message.slice(0, 1000), completed_at: now, updated_at: now }).eq('id', event.id),
      ]);
      await writeAudit({ userId: context.userId, action: 'communications.ai_call_started', targetType: 'communication_event', targetId: event.id, status: 'failed', metadata: { purpose: data.purpose, error: message.slice(0, 500) } });
      throw error;
    }
  });

export const sendCommunicationPhonePush = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(1000),
    purpose: z.enum(['project_update','agent_update','business_update','approval','reminder','custom']),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const prefs = await loadPreferences(context.userId);
    if (!prefs.phone_push_enabled) throw new Error('Phone push notifications are disabled.');
    if (!purposeEnabled(prefs, data.purpose)) throw new Error('This update category is disabled in Phone & Voice preferences.');

    const endpoints = await admin.from('notification_endpoints').select('id,topic').eq('user_id', context.userId).eq('provider', 'ntfy').eq('enabled', true);
    if (endpoints.error) throw new Error(endpoints.error.message);
    if (!endpoints.data?.length) throw new Error('No enabled phone push endpoint is connected.');
    const base = (process.env.NTFY_BASE_URL?.trim() || 'https://ntfy.sh').replace(/\/+$/, '');
    const token = process.env.NTFY_TOKEN?.trim();
    let sent = 0;
    for (const endpoint of endpoints.data) {
      const response = await fetch(`${base}/${encodeURIComponent(endpoint.topic)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: data.title, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: data.body,
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) sent += 1;
    }
    if (!sent) throw new Error('Phone push provider rejected the notification.');
    const event = await admin.from('communication_events').insert({
      user_id: context.userId, channel: 'push', purpose: data.purpose, title: data.title, body: data.body,
      status: 'sent', provider: 'ntfy', sent_at: new Date().toISOString(), metadata: { endpoints_sent: sent },
    }).select('id').single();
    if (event.error) throw new Error(event.error.message);
    await writeAudit({ userId: context.userId, action: 'communications.phone_push_sent', targetType: 'communication_event', targetId: event.data?.id, status: 'success', metadata: { endpoints: sent, purpose: data.purpose } });
    return { ok: true, endpoints_sent: sent, event_id: event.data?.id ?? null };
  });
