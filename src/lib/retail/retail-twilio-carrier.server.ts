import { supabaseAdmin } from '@/integrations/supabase/client.server';
import {
  buildRetailTwilioRequest,
  getRetailTwilioCapabilities,
  parseRetailTwilioPayload,
  resolveRetailTwilioConfig,
  type RetailTwilioCapabilities,
} from './retail-twilio-carrier';

type AdminSb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as AdminSb;

type RetailActionRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  profile_id: string | null;
  call_id: string | null;
  appointment_id: string | null;
  order_id: string | null;
  action_type: string;
  status: string;
  payload: unknown;
};

export type RetailTwilioExecutionResult = {
  action_id: string;
  status: string;
  action_type: 'send_communication';
  delivered: boolean;
  provider_accepted?: boolean;
  provider_status?: string;
  communication_id?: string;
  provider?: 'twilio';
  reason?: string;
};

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

export function getRetailTwilioRuntimeCapabilities(): RetailTwilioCapabilities {
  return getRetailTwilioCapabilities(runtimeConfig());
}

function channelFromPayload(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const channel = (value as Record<string, unknown>)['channel'];
  return typeof channel === 'string' ? channel.trim().toLowerCase() : '';
}

async function failAction(
  userId: string,
  actionId: string,
  reason: string,
  communicationId?: string,
): Promise<RetailTwilioExecutionResult> {
  const now = new Date().toISOString();
  if (communicationId) {
    await adminSb
      .from('retail_customer_communications')
      .update({ status: 'failed', provider: 'twilio', last_error: reason.slice(0, 1800), updated_at: now })
      .eq('id', communicationId)
      .eq('user_id', userId);
  }
  await adminSb
    .from('retail_reception_actions')
    .update({ status: 'failed', last_error: reason.slice(0, 1800), executed_at: now, updated_at: now })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'executing');

  return {
    action_id: actionId,
    status: 'failed',
    action_type: 'send_communication',
    delivered: false,
    provider_accepted: false,
    provider: 'twilio',
    ...(communicationId ? { communication_id: communicationId } : {}),
    reason: reason.slice(0, 500),
  };
}

function safeProviderError(body: Record<string, unknown>, status: number) {
  const message = typeof body['message'] === 'string' ? body['message'].trim() : '';
  const code = body['code'];
  const prefix = code !== undefined && code !== null ? `Twilio ${String(code)}` : `Twilio HTTP ${status}`;
  return message ? `${prefix}: ${message}`.slice(0, 1800) : `${prefix}: provider rejected the request.`;
}

/**
 * Executes configured SMS, WhatsApp and bounded outbound voice notifications.
 * The Retail action is claimed before the provider call, which makes one action
 * at-most-once from Blackstar's perspective. Twilio API acceptance is stored as
 * provider acceptance, not as confirmed handset/recipient delivery.
 */
export async function tryExecuteRetailTwilioCommunication(
  userId: string,
  actionId: string,
): Promise<RetailTwilioExecutionResult | null> {
  const { data: preview, error: previewError } = await adminSb
    .from('retail_reception_actions')
    .select('id,user_id,workspace_id,profile_id,call_id,appointment_id,order_id,action_type,status,payload')
    .eq('id', actionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !preview) return null;
  const previewRow = preview as RetailActionRow;
  const channel = channelFromPayload(previewRow.payload);
  if (previewRow.action_type !== 'send_communication' || !['sms','whatsapp','voice'].includes(channel)) return null;

  const config = runtimeConfig();
  const capabilities = getRetailTwilioCapabilities(config);
  if (!config || !capabilities[channel as keyof RetailTwilioCapabilities]) return null;

  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await adminSb
    .from('retail_reception_actions')
    .update({ status: 'executing', last_error: null, updated_at: claimedAt })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('action_type', 'send_communication')
    .eq('status', 'approved')
    .select('id,user_id,workspace_id,profile_id,call_id,appointment_id,order_id,action_type,status,payload')
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    return {
      action_id: actionId,
      status: previewRow.status,
      action_type: 'send_communication',
      delivered: false,
      provider_accepted: false,
      provider: 'twilio',
      reason: 'Retail communication action is not approved or has already been claimed.',
    };
  }

  const action = claimed as RetailActionRow;
  if (action.profile_id) {
    const { data: profile, error: profileError } = await adminSb
      .from('retail_reception_profiles')
      .select('id,active,can_send_communications')
      .eq('id', action.profile_id)
      .eq('workspace_id', action.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (profileError || !profile || !profile.active || !profile.can_send_communications) {
      return failAction(userId, actionId, 'Receptionist profile does not permit communication delivery.');
    }
  }

  let payload;
  try {
    payload = parseRetailTwilioPayload(action.payload);
  } catch (error) {
    return failAction(userId, actionId, error instanceof Error ? error.message : 'Retail carrier payload is invalid.');
  }

  const { data: communication, error: communicationError } = await adminSb
    .from('retail_customer_communications')
    .insert({
      user_id: userId,
      workspace_id: action.workspace_id,
      appointment_id: action.appointment_id,
      call_id: action.call_id,
      order_id: action.order_id,
      action_id: action.id,
      direction: 'outbound',
      channel: payload.channel,
      purpose: payload.purpose,
      recipient: payload.recipient,
      subject: payload.subject ?? null,
      body: payload.body,
      scheduled_for: claimedAt,
      status: 'ready',
      provider: 'twilio',
      metadata: {
        source: 'retail_reception_action',
        provider_delivery_required: true,
        provider_accepted: false,
        delivery_confirmed: false,
        execution_claimed_at: claimedAt,
        ...(payload.channel === 'voice' ? { voice_mode: 'outbound_notification', interactive_receptionist: false } : {}),
      },
    })
    .select('id')
    .single();

  if (communicationError || !communication) {
    return failAction(userId, actionId, communicationError?.message || 'Retail communication ledger entry could not be created.');
  }

  const communicationId = String(communication.id);
  let response: Response;
  let responseBody: Record<string, unknown> = {};
  try {
    const request = buildRetailTwilioRequest(config, payload);
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    response = await fetch(request.url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: request.body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    if (raw) {
      try { responseBody = JSON.parse(raw) as Record<string, unknown>; }
      catch { responseBody = {}; }
    }
  } catch (error) {
    return failAction(userId, actionId, error instanceof Error ? `Twilio request failed: ${error.message}` : 'Twilio request failed.', communicationId);
  }

  const providerSid = typeof responseBody['sid'] === 'string' ? responseBody['sid'].trim().slice(0, 500) : '';
  const providerStatus = typeof responseBody['status'] === 'string' ? responseBody['status'].trim().slice(0, 120) : '';
  if (!response.ok || !providerSid) {
    return failAction(userId, actionId, safeProviderError(responseBody, response.status), communicationId);
  }

  const acceptedAt = new Date().toISOString();
  const { error: communicationFinalizeError } = await adminSb
    .from('retail_customer_communications')
    .update({
      status: 'sent',
      provider: 'twilio',
      provider_message_id: providerSid,
      sent_at: acceptedAt,
      delivered_at: null,
      last_error: null,
      metadata: {
        source: 'retail_reception_action',
        provider_delivery_required: false,
        provider_accepted: true,
        provider_status: providerStatus || 'accepted',
        delivery_confirmed: false,
        execution_claimed_at: claimedAt,
        provider_accepted_at: acceptedAt,
        ...(payload.channel === 'voice' ? { voice_mode: 'outbound_notification', interactive_receptionist: false } : {}),
      },
      updated_at: acceptedAt,
    })
    .eq('id', communicationId)
    .eq('user_id', userId)
    .eq('status', 'ready');

  const { error: actionFinalizeError } = await adminSb
    .from('retail_reception_actions')
    .update({ status: 'executed', executed_at: acceptedAt, last_error: null, updated_at: acceptedAt })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'executing');

  if (communicationFinalizeError || actionFinalizeError) {
    return {
      action_id: actionId,
      status: 'executing',
      action_type: 'send_communication',
      delivered: false,
      provider_accepted: true,
      provider_status: providerStatus || 'accepted',
      communication_id: communicationId,
      provider: 'twilio',
      reason: 'Twilio accepted the request, but Blackstar could not fully persist the final provider-accepted state. Automatic retry is blocked to prevent duplicate execution.',
    };
  }

  return {
    action_id: actionId,
    status: 'executed',
    action_type: 'send_communication',
    delivered: false,
    provider_accepted: true,
    provider_status: providerStatus || 'accepted',
    communication_id: communicationId,
    provider: 'twilio',
    reason: 'Twilio accepted the request. Final recipient delivery has not yet been confirmed.',
  };
}
