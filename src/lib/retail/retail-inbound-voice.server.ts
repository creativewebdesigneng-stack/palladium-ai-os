import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { computeTwilioFormSignature } from './retail-twilio-webhook.server';
import { escapeTwimlText, resolveRetailTwilioConfig } from './retail-twilio-carrier';
import { runRetailReceptionistCore, type RetailReceptionistInquiry } from './retail-receptionist-core.server';

type AdminSb = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => any;
};
type TwilioApiBody = Record<string, any> & {
  message?: any;
  incoming_phone_numbers?: any;
  phone_number?: any;
  sid?: any;
  voice_application_sid?: any;
  trunk_sid?: any;
  voice_url?: any;
  status_callback?: any;
  friendly_name?: any;
};
type HistoryCandidate = { role?: unknown; content?: unknown };

const adminSb = supabaseAdmin as unknown as AdminSb;

const INCOMING_PATH = '/api/public/retail/twilio-voice/incoming';
const TURN_PATH = '/api/public/retail/twilio-voice/turn';
const STATUS_PATH = '/api/public/retail/twilio-voice/status';
const E164 = /^\+[1-9]\d{7,14}$/;
const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const PHONE_SID = /^PN[0-9a-fA-F]{32}$/;

function runtimeConfig() {
  return resolveRetailTwilioConfig({
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_SMS_FROM_NUMBER: process.env.TWILIO_SMS_FROM_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_VOICE_FROM_NUMBER: process.env.TWILIO_VOICE_FROM_NUMBER,
  });
}

function appOrigin() {
  const value = process.env.APP_ORIGIN?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function absoluteUrl(path: string) {
  const origin = appOrigin();
  return origin ? new URL(path, origin).toString() : null;
}

export function getRetailInboundVoiceRuntime() {
  const config = runtimeConfig();
  const incomingUrl = absoluteUrl(INCOMING_PATH);
  const turnUrl = absoluteUrl(TURN_PATH);
  const statusUrl = absoluteUrl(STATUS_PATH);
  return {
    configured: Boolean(config && incomingUrl && turnUrl && statusUrl),
    twilio_configured: Boolean(config),
    app_origin_configured: Boolean(appOrigin()),
    incoming_url: incomingUrl,
    turn_url: turnUrl,
    status_url: statusUrl,
  };
}

function authHeader(config: NonNullable<ReturnType<typeof runtimeConfig>>) {
  return `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`;
}

async function twilioRequest(path: string, init?: RequestInit): Promise<TwilioApiBody> {
  const config = runtimeConfig();
  if (!config) throw new Error('twilio_not_configured');
  const response = await fetch(`https://api.twilio.com${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(config),
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let body: TwilioApiBody = {};
  if (raw) {
    try { body = JSON.parse(raw) as TwilioApiBody; }
    catch { body = {}; }
  }
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : `Twilio HTTP ${response.status}`;
    throw new Error(`twilio_api_error:${message}`.slice(0, 1000));
  }
  return body;
}

export async function fetchRetailTwilioIncomingNumber(phoneSid: string) {
  if (!PHONE_SID.test(phoneSid)) throw new Error('invalid_twilio_phone_sid');
  const config = runtimeConfig();
  if (!config) throw new Error('twilio_not_configured');
  const row = await twilioRequest(`/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`);
  const phone = String(row.phone_number ?? '');
  if (!E164.test(phone) || String(row.sid ?? '') !== phoneSid) throw new Error('twilio_phone_number_invalid');
  if (row.voice_application_sid || row.trunk_sid) throw new Error('twilio_number_uses_voice_application_or_trunk');
  return { sid: phoneSid, phone_number: phone };
}

export async function configureRetailTwilioIncomingNumber(phoneSid: string) {
  const runtime = getRetailInboundVoiceRuntime();
  const config = runtimeConfig();
  if (!runtime.configured || !config || !runtime.incoming_url || !runtime.status_url) throw new Error('retail_inbound_voice_not_configured');
  const verified = await fetchRetailTwilioIncomingNumber(phoneSid);
  const form = new URLSearchParams({
    VoiceUrl: runtime.incoming_url,
    VoiceMethod: 'POST',
    StatusCallback: runtime.status_url,
    StatusCallbackMethod: 'POST',
  });
  await twilioRequest(`/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`, {
    method: 'POST',
    body: form.toString(),
  });
  return verified;
}

export async function detachRetailTwilioIncomingNumber(phoneSid: string) {
  if (!PHONE_SID.test(phoneSid)) throw new Error('invalid_twilio_phone_sid');
  const config = runtimeConfig();
  if (!config) return false;
  const row = await twilioRequest(`/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`);
  const expectedIncoming = absoluteUrl(INCOMING_PATH);
  const expectedStatus = absoluteUrl(STATUS_PATH);
  if (row.voice_url !== expectedIncoming && row.status_callback !== expectedStatus) return false;
  const form = new URLSearchParams();
  if (row.voice_url === expectedIncoming) form.set('VoiceUrl', '');
  if (row.status_callback === expectedStatus) form.set('StatusCallback', '');
  if ([...form.keys()].length === 0) return false;
  await twilioRequest(`/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`, {
    method: 'POST',
    body: form.toString(),
  });
  return true;
}

function webhookError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyRetailTwilioVoiceRequest(
  request: Request,
  path: typeof INCOMING_PATH | typeof TURN_PATH | typeof STATUS_PATH,
) {
  const config = runtimeConfig();
  const url = absoluteUrl(path);
  if (!config || !url) throw webhookError('Retail inbound voice is not configured.', 503);
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) throw webhookError('Unsupported Twilio webhook content type.', 415);
  const signature = request.headers.get('x-twilio-signature')?.trim();
  if (!signature) throw webhookError('Missing Twilio signature.', 401);
  const params = new URLSearchParams(await request.text());
  if (params.get('AccountSid') !== config.accountSid) throw webhookError('Twilio account mismatch.', 401);
  const expected = computeTwilioFormSignature(url, params, config.authToken);
  if (!signaturesMatch(expected, signature)) throw webhookError('Invalid Twilio signature.', 401);
  return params;
}

function param(params: URLSearchParams, key: string, max = 4000) {
  return (params.get(key) ?? '').trim().slice(0, max);
}

function safeHistory(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => item as HistoryCandidate)
    .filter((item) => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map((item) => ({ role: item.role as 'user' | 'assistant', content: String(item.content).slice(0, 4000) }))
    .slice(-8);
}

function responseXml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function gatherTwiml(prompt: string, endAfter = false) {
  const safe = escapeTwimlText(prompt.slice(0, 3500));
  if (endAfter) return responseXml(`<Response><Say>${safe}</Say><Hangup/></Response>`);
  const turn = absoluteUrl(TURN_PATH);
  if (!turn) return responseXml('<Response><Say>Phone service is temporarily unavailable.</Say><Hangup/></Response>');
  return responseXml(`<Response><Gather input="speech" action="${escapeTwimlText(turn)}" method="POST" speechTimeout="auto" actionOnEmptyResult="true"><Say>${safe}</Say></Gather><Say>Sorry, I did not hear anything. Please call again if you still need help.</Say><Hangup/></Response>`);
}

async function endpointForCalledNumber(calledPhone: string) {
  if (!E164.test(calledPhone)) return null;
  const { data, error } = await adminSb.from('retail_reception_voice_endpoints')
    .select('id,user_id,workspace_id,profile_id,phone_number,provider_phone_sid,active,webhook_configured')
    .eq('provider', 'twilio')
    .eq('phone_number', calledPhone)
    .eq('active', true)
    .eq('webhook_configured', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function loadProfile(profileId: string, userId: string, workspaceId: string) {
  const { data, error } = await adminSb.from('retail_reception_profiles')
    .select('id,name,greeting,after_hours_message,active')
    .eq('id', profileId).eq('user_id', userId).eq('workspace_id', workspaceId).eq('active', true).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function ensureVoiceSession(params: URLSearchParams, endpoint: any) {
  const callSid = param(params, 'CallSid', 80);
  const caller = param(params, 'From', 80);
  const called = param(params, 'To', 80);
  if (!CALL_SID.test(callSid) || !E164.test(called)) throw webhookError('Invalid Twilio call identity.', 400);

  const existing = await adminSb.from('retail_reception_voice_sessions')
    .select('*').eq('provider', 'twilio').eq('provider_call_sid', callSid).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  let session = existing.data;
  if (!session) {
    const inserted = await adminSb.from('retail_reception_voice_sessions').insert({
      user_id: endpoint.user_id,
      workspace_id: endpoint.workspace_id,
      profile_id: endpoint.profile_id,
      endpoint_id: endpoint.id,
      provider: 'twilio',
      provider_call_sid: callSid,
      caller_phone: E164.test(caller) ? caller : null,
      called_phone: called,
      status: 'in_progress',
      turn_count: 0,
      history: [],
    }).select('*').single();
    if (inserted.error) {
      const retry = await adminSb.from('retail_reception_voice_sessions').select('*').eq('provider', 'twilio').eq('provider_call_sid', callSid).maybeSingle();
      if (retry.error || !retry.data) throw new Error(inserted.error.message);
      session = retry.data;
    } else {
      session = inserted.data;
    }
  }

  if (!session.call_id) {
    const call = await adminSb.from('retail_call_inbox').insert({
      user_id: endpoint.user_id,
      workspace_id: endpoint.workspace_id,
      direction: 'inbound',
      phone: E164.test(caller) ? caller : null,
      reason: 'Inbound AI receptionist phone call',
      status: 'new',
      needs_follow_up: false,
      source: 'phone_provider',
      received_at: new Date().toISOString(),
    }).select('id').single();
    if (!call.error && call.data) {
      const linked = await adminSb.from('retail_reception_voice_sessions')
        .update({ call_id: call.data.id, updated_at: new Date().toISOString() })
        .eq('id', session.id).is('call_id', null).select('*').maybeSingle();
      if (!linked.error && linked.data) session = linked.data;
      else await adminSb.from('retail_call_inbox').delete().eq('id', call.data.id).eq('user_id', endpoint.user_id);
    }
  }
  return session;
}

export async function processRetailTwilioVoiceIncoming(params: URLSearchParams) {
  const called = param(params, 'To', 80);
  const endpoint = await endpointForCalledNumber(called);
  if (!endpoint) return responseXml('<Response><Say>This number is not connected to an active Blackstar receptionist.</Say><Hangup/></Response>');
  const profile = await loadProfile(endpoint.profile_id, endpoint.user_id, endpoint.workspace_id);
  if (!profile) return responseXml('<Response><Say>The receptionist is currently unavailable.</Say><Hangup/></Response>');
  await ensureVoiceSession(params, endpoint);
  const greeting = String(profile.greeting ?? '').trim() || `Hello. You have reached ${String(profile.name ?? 'the business')}. How can I help?`;
  return gatherTwiml(greeting);
}

export async function processRetailTwilioVoiceTurn(params: URLSearchParams) {
  const called = param(params, 'To', 80);
  const callSid = param(params, 'CallSid', 80);
  const transcript = param(params, 'SpeechResult', 4000);
  if (!CALL_SID.test(callSid)) throw webhookError('Invalid Twilio call identity.', 400);
  const endpoint = await endpointForCalledNumber(called);
  if (!endpoint) return responseXml('<Response><Say>The receptionist is no longer available.</Say><Hangup/></Response>');
  const sessionResult = await adminSb.from('retail_reception_voice_sessions')
    .select('*').eq('provider', 'twilio').eq('provider_call_sid', callSid).eq('endpoint_id', endpoint.id).maybeSingle();
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  const session = sessionResult.data;
  if (!session) return responseXml('<Response><Say>I could not restore this call session. Please call again.</Say><Hangup/></Response>');
  if (!transcript) return gatherTwiml('I did not catch that. Please say that again.');
  if (Number(session.turn_count ?? 0) >= 20) return gatherTwiml('I have reached the maximum automated call length. A member of staff can continue from here. Goodbye.', true);

  const history = safeHistory(session.history);
  const inquiry: RetailReceptionistInquiry = {
    workspace_id: endpoint.workspace_id,
    profile_id: endpoint.profile_id,
    location_id: null,
    call_id: session.call_id ?? null,
    appointment_id: null,
    customer_email: '',
    customer_phone: E164.test(String(session.caller_phone ?? '')) ? String(session.caller_phone) : '',
    question: transcript,
    history,
  };

  try {
    const result = await runRetailReceptionistCore({
      sb: adminSb,
      userId: endpoint.user_id,
      data: inquiry,
      surface: 'retail_phone_receptionist',
    });
    const nextHistory = [...history, { role: 'user' as const, content: transcript }, { role: 'assistant' as const, content: result.answer }].slice(-8);
    const nextTurn = Number(session.turn_count ?? 0) + 1;
    await adminSb.from('retail_reception_voice_sessions').update({
      status: 'in_progress',
      turn_count: nextTurn,
      history: nextHistory,
      last_transcript: transcript,
      updated_at: new Date().toISOString(),
    }).eq('id', session.id).eq('user_id', endpoint.user_id);
    return gatherTwiml(result.answer, nextTurn >= 20);
  } catch (error) {
    if (session.call_id) {
      await adminSb.from('retail_call_inbox').update({
        status: 'follow_up',
        needs_follow_up: true,
        outcome: 'AI receptionist unavailable during live call',
        updated_at: new Date().toISOString(),
      }).eq('id', session.call_id).eq('user_id', endpoint.user_id);
    }
    console.error('Retail inbound receptionist turn failed:', error);
    return gatherTwiml('I am having trouble accessing the receptionist service right now. I have marked this call for staff follow-up. Goodbye.', true);
  }
}

export async function processRetailTwilioVoiceStatus(params: URLSearchParams) {
  const callSid = param(params, 'CallSid', 80);
  const providerStatus = param(params, 'CallStatus', 80).toLowerCase();
  if (!CALL_SID.test(callSid)) throw webhookError('Invalid Twilio call identity.', 400);
  const result = await adminSb.from('retail_reception_voice_sessions')
    .select('id,user_id,call_id,status,turn_count').eq('provider', 'twilio').eq('provider_call_sid', callSid).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return { accepted: true, matched: false };
  const terminalFailure = ['busy','failed','no-answer','canceled','cancelled'].includes(providerStatus);
  const terminal = terminalFailure || providerStatus === 'completed';
  const mapped = terminalFailure ? 'failed' : terminal ? 'completed' : providerStatus === 'in-progress' ? 'in_progress' : 'ringing';
  const now = new Date().toISOString();
  await adminSb.from('retail_reception_voice_sessions').update({
    status: mapped,
    ...(terminal ? { ended_at: now } : {}),
    updated_at: now,
  }).eq('id', result.data.id).eq('user_id', result.data.user_id);
  if (terminal && result.data.call_id) {
    const callStatus = terminalFailure ? 'follow_up' : 'handled';
    await adminSb.from('retail_call_inbox').update({
      status: callStatus,
      needs_follow_up: terminalFailure,
      outcome: `Twilio call ${providerStatus}; ${Number(result.data.turn_count ?? 0)} AI turn(s)`,
      updated_at: now,
    }).eq('id', result.data.call_id).eq('user_id', result.data.user_id);
  }
  return { accepted: true, matched: true, provider_status: providerStatus, terminal };
}

export const retailTwilioVoicePaths = {
  incoming: INCOMING_PATH,
  turn: TURN_PATH,
  status: STATUS_PATH,
} as const;
