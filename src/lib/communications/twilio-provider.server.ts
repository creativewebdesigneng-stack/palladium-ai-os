import { timingSafeEqual } from 'node:crypto';
import { computeTwilioFormSignature } from '@/lib/retail/retail-twilio-webhook.server';
import {
  escapeTwimlText,
  getRetailTwilioCapabilities,
  resolveRetailTwilioConfig,
} from '@/lib/retail/retail-twilio-carrier';

const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const VERIFY_SERVICE_SID = /^VA[0-9a-fA-F]{32}$/;

function config() {
  return resolveRetailTwilioConfig({
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_SMS_FROM_NUMBER: process.env.TWILIO_SMS_FROM_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_VOICE_FROM_NUMBER: process.env.TWILIO_VOICE_FROM_NUMBER,
  });
}

function origin() {
  const raw = process.env.APP_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const value = new URL(raw);
    return value.protocol === 'https:' ? value.origin : null;
  } catch {
    return null;
  }
}

export function communicationsRuntimeCapabilities() {
  const twilio = config();
  const capabilities = getRetailTwilioCapabilities(twilio);
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? '';
  return {
    phone_push: true,
    sms: capabilities.sms,
    ai_voice_calls: Boolean(capabilities.voice && origin()),
    phone_verification: Boolean(twilio && VERIFY_SERVICE_SID.test(verifySid)),
    signed_webhooks: Boolean(twilio && origin()),
  };
}

function authHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

async function postForm(url: string, body: URLSearchParams) {
  const twilio = config();
  if (!twilio) throw new Error('Twilio is not configured on this deployment.');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(twilio.accountSid, twilio.authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  if (raw) {
    try { parsed = JSON.parse(raw) as Record<string, unknown>; }
    catch { parsed = {}; }
  }
  if (!response.ok) {
    const providerMessage = typeof parsed['message'] === 'string' ? parsed['message'] : '';
    throw new Error(providerMessage ? `Twilio rejected the request: ${providerMessage}` : `Twilio rejected the request (${response.status}).`);
  }
  return parsed;
}

export async function startPhoneVerification(phoneE164: string) {
  const twilio = config();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? '';
  if (!twilio || !VERIFY_SERVICE_SID.test(serviceSid)) throw new Error('Twilio Verify is not configured.');
  const body = new URLSearchParams({ To: phoneE164, Channel: 'sms' });
  const result = await postForm(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, body);
  return { status: String(result['status'] ?? 'pending').slice(0, 80) };
}

export async function checkPhoneVerification(phoneE164: string, code: string) {
  const twilio = config();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? '';
  if (!twilio || !VERIFY_SERVICE_SID.test(serviceSid)) throw new Error('Twilio Verify is not configured.');
  const body = new URLSearchParams({ To: phoneE164, Code: code });
  const result = await postForm(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, body);
  return String(result['status'] ?? '').toLowerCase() === 'approved';
}

export async function sendTwilioSms(input: {
  to: string;
  body: string;
  statusCallbackUrl?: string | null;
}) {
  const twilio = config();
  if (!twilio) throw new Error('Twilio is not configured.');
  const capabilities = getRetailTwilioCapabilities(twilio);
  if (!capabilities.sms) throw new Error('Twilio SMS is not configured.');
  const form = new URLSearchParams({ To: input.to, Body: input.body });
  if (twilio.messagingServiceSid) form.set('MessagingServiceSid', twilio.messagingServiceSid);
  else if (twilio.smsFromNumber) form.set('From', twilio.smsFromNumber);
  if (input.statusCallbackUrl) form.set('StatusCallback', input.statusCallbackUrl);
  const result = await postForm(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, form);
  const sid = String(result['sid'] ?? '');
  if (!/^SM[0-9a-fA-F]{32}$/.test(sid)) throw new Error('Twilio did not return a valid message identifier.');
  return { sid, status: String(result['status'] ?? 'accepted').slice(0, 80) };
}

export function communicationsPublicUrl(path: string, params?: Record<string, string>) {
  const base = origin();
  if (!base) return null;
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return url.toString();
}

export async function startTwilioAiCall(input: {
  to: string;
  sessionId: string;
}) {
  const twilio = config();
  if (!twilio?.voiceFromNumber) throw new Error('Twilio voice is not configured.');
  const voiceUrl = communicationsPublicUrl('/api/public/communications/twilio/voice', { session: input.sessionId });
  const statusUrl = communicationsPublicUrl('/api/public/communications/twilio/status', { session: input.sessionId });
  if (!voiceUrl || !statusUrl) throw new Error('APP_ORIGIN must be a public HTTPS origin before AI calls can run.');

  const form = new URLSearchParams({
    To: input.to,
    From: twilio.voiceFromNumber,
    Url: voiceUrl,
    Method: 'POST',
    StatusCallback: statusUrl,
    StatusCallbackMethod: 'POST',
  });
  for (const event of ['initiated', 'ringing', 'answered', 'completed']) form.append('StatusCallbackEvent', event);
  const result = await postForm(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Calls.json`, form);
  const sid = String(result['sid'] ?? '');
  if (!CALL_SID.test(sid)) throw new Error('Twilio did not return a valid call identifier.');
  return { sid, status: String(result['status'] ?? 'queued').slice(0, 80) };
}

function webhookError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyTwilioCommunicationsWebhook(request: Request, canonicalUrl: string) {
  const twilio = config();
  if (!twilio) throw webhookError('Twilio is not configured.', 503);
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) throw webhookError('Unsupported Twilio webhook content type.', 415);
  const signature = request.headers.get('x-twilio-signature')?.trim();
  if (!signature) throw webhookError('Missing Twilio signature.', 401);
  const params = new URLSearchParams(await request.text());
  if (params.get('AccountSid') !== twilio.accountSid) throw webhookError('Twilio account mismatch.', 401);
  const expected = computeTwilioFormSignature(canonicalUrl, params, twilio.authToken);
  if (!signaturesMatch(expected, signature)) throw webhookError('Invalid Twilio signature.', 401);
  return params;
}

export function twimlGather(prompt: string, turnUrl: string) {
  const safePrompt = escapeTwimlText(prompt.slice(0, 3500));
  const safeTurnUrl = escapeTwimlText(turnUrl);
  return twimlResponse(`<Gather input="speech" action="${safeTurnUrl}" method="POST" speechTimeout="auto" actionOnEmptyResult="true"><Say>${safePrompt}</Say></Gather><Say>I did not hear anything. You can continue in Blackstar at any time. Goodbye.</Say><Hangup/>`);
}

export function twimlSayAndHangup(message: string, status = 200) {
  return twimlResponse(`<Say>${escapeTwimlText(message.slice(0, 3500))}</Say><Hangup/>`, status);
}

export function twimlResponse(xml: string, status = 200) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
