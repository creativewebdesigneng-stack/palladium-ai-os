import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

type AdminSb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as AdminSb;

type CommunicationRow = {
  id: string;
  user_id: string;
  channel: 'sms' | 'whatsapp' | 'voice' | string;
  status: string;
  delivered_at: string | null;
  metadata: unknown;
};

function webhookError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export function getRetailTwilioStatusCallbackUrl() {
  const origin = process.env.APP_ORIGIN?.trim();
  if (!origin) return null;
  try {
    const url = new URL('/api/public/retail/twilio-status', origin);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function computeTwilioFormSignature(url: string, params: URLSearchParams, authToken: string) {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of params.entries()) {
    const values = grouped.get(key) ?? [];
    values.push(value);
    grouped.set(key, values);
  }
  let payload = url;
  for (const key of [...grouped.keys()].sort()) {
    for (const value of (grouped.get(key) ?? []).sort()) payload += `${key}${value}`;
  }
  return createHmac('sha1', authToken).update(payload, 'utf8').digest('base64');
}

function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyRetailTwilioStatusRequest(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const callbackUrl = getRetailTwilioStatusCallbackUrl();
  if (!authToken || !callbackUrl) throw webhookError('Twilio status callbacks are not configured.', 503);

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) throw webhookError('Unsupported Twilio callback content type.', 415);

  const signature = request.headers.get('x-twilio-signature')?.trim();
  if (!signature) throw webhookError('Missing Twilio signature.', 401);

  const params = new URLSearchParams(await request.text());
  const expected = computeTwilioFormSignature(callbackUrl, params, authToken);
  if (!signaturesMatch(expected, signature)) throw webhookError('Invalid Twilio signature.', 401);
  return params;
}

function textParam(params: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return '';
}

function existingMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function processRetailTwilioStatus(params: URLSearchParams) {
  const providerSid = textParam(params, 'MessageSid', 'CallSid').slice(0, 500);
  const providerStatus = textParam(params, 'MessageStatus', 'SmsStatus', 'CallStatus').toLowerCase().slice(0, 120);
  if (!providerSid || !providerStatus) throw webhookError('Twilio callback is missing a provider SID or status.', 400);

  const { data, error } = await adminSb
    .from('retail_customer_communications')
    .select('id,user_id,channel,status,delivered_at,metadata')
    .eq('provider', 'twilio')
    .eq('provider_message_id', providerSid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { accepted: true, matched: false };

  const row = data as CommunicationRow;
  const now = new Date().toISOString();
  const failureStatuses = new Set(['failed','undelivered','busy','no-answer','canceled','cancelled']);
  const messageDelivered = new Set(['delivered','read']);
  const voiceAnswered = row.channel === 'voice' && ['in-progress','completed'].includes(providerStatus);
  const deliveryConfirmed = messageDelivered.has(providerStatus) || voiceAnswered;
  const failed = failureStatuses.has(providerStatus);
  const errorCode = textParam(params, 'ErrorCode');
  const errorMessage = textParam(params, 'ErrorMessage', 'ChannelStatusMessage');
  const lastError = failed
    ? [errorCode ? `Twilio ${errorCode}` : 'Twilio delivery failed', errorMessage].filter(Boolean).join(': ').slice(0, 1800)
    : null;

  const priorMetadata = existingMetadata(row.metadata);
  const metadata = {
    ...priorMetadata,
    provider_status: providerStatus,
    status_callback_received_at: now,
    delivery_confirmed: deliveryConfirmed || Boolean(row.delivered_at),
    ...(providerStatus === 'read' ? { read_at: now } : {}),
    ...(textParam(params, 'CallDuration') ? { call_duration_seconds: textParam(params, 'CallDuration') } : {}),
  };

  const { error: updateError } = await adminSb
    .from('retail_customer_communications')
    .update({
      status: failed ? 'failed' : 'sent',
      delivered_at: deliveryConfirmed ? (row.delivered_at ?? now) : row.delivered_at,
      last_error: lastError,
      metadata,
      updated_at: now,
    })
    .eq('id', row.id)
    .eq('provider', 'twilio')
    .eq('provider_message_id', providerSid);
  if (updateError) throw new Error(updateError.message);

  const bookingReminderId = typeof priorMetadata['retail_booking_reminder_id'] === 'string'
    ? priorMetadata['retail_booking_reminder_id']
    : '';
  if (bookingReminderId) {
    const { error: reminderError } = await adminSb
      .from('retail_booking_reminders')
      .update({
        status: failed ? 'failed' : 'sent',
        next_attempt_at: null,
        last_error: lastError,
        updated_at: now,
      })
      .eq('id', bookingReminderId)
      .eq('user_id', row.user_id)
      .eq('provider_message_id', providerSid);
    if (reminderError) throw new Error(reminderError.message);
  }

  return {
    accepted: true,
    matched: true,
    provider_status: providerStatus,
    delivery_confirmed: deliveryConfirmed || Boolean(row.delivered_at),
    failed,
    booking_reminder_reconciled: Boolean(bookingReminderId),
  };
}