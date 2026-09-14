import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { executeApprovedAction } from '@/lib/integrations/approved-action.server';
import { parseRetailEmailPayload, retailProviderMessageId } from './retail-connected-delivery';

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

export type RetailExternalDeliveryCapabilities = {
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  voice: boolean;
};

export type RetailConnectedExecutionResult = {
  action_id: string;
  status: string;
  action_type: 'send_communication';
  delivered: boolean;
  communication_id?: string;
  provider?: string;
  reason?: string;
};

function providerName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/^nango_/, '') : '';
}

function payloadChannel(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const channel = (value as Record<string, unknown>)['channel'];
  return typeof channel === 'string' ? channel.trim().toLowerCase() : '';
}

export async function getRetailExternalDeliveryCapabilities(
  userId: string,
): Promise<RetailExternalDeliveryCapabilities> {
  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('provider')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .in('provider', ['google', 'microsoft', 'nango_google', 'nango_microsoft']);

  if (error) return { sms: false, email: false, whatsapp: false, voice: false };
  const providers = new Set((data ?? []).map((row: { provider?: unknown }) => providerName(row.provider)));
  return {
    sms: false,
    email: providers.has('google') || providers.has('microsoft'),
    whatsapp: false,
    voice: false,
  };
}

async function failClaimedAction(
  userId: string,
  actionId: string,
  reason: string,
  communicationId?: string,
  provider?: string,
): Promise<RetailConnectedExecutionResult> {
  const now = new Date().toISOString();
  if (communicationId) {
    await supabaseAdmin
      .from('retail_customer_communications')
      .update({
        status: 'failed',
        last_error: reason.slice(0, 1800),
        ...(provider ? { provider } : {}),
        updated_at: now,
      })
      .eq('id', communicationId)
      .eq('user_id', userId);
  }
  await supabaseAdmin
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
    ...(communicationId ? { communication_id: communicationId } : {}),
    ...(provider ? { provider } : {}),
    reason: reason.slice(0, 500),
  };
}

/**
 * Claims and executes an approved Retail email exactly once through Blackstar's
 * existing bounded Google/Microsoft approved-action transport. A claim moves
 * the Retail action from approved -> executing before the provider side effect;
 * retries therefore cannot send a second copy if final persistence fails.
 *
 * Returns null for channels that this adapter does not own so the existing
 * Retail RPC remains authoritative for in-app and unsupported channels.
 */
export async function tryExecuteRetailConnectedCommunication(
  userId: string,
  actionId: string,
): Promise<RetailConnectedExecutionResult | null> {
  const { data: preview, error: previewError } = await supabaseAdmin
    .from('retail_reception_actions')
    .select('id,user_id,workspace_id,profile_id,call_id,appointment_id,order_id,action_type,status,payload')
    .eq('id', actionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !preview) return null;
  const previewRow = preview as RetailActionRow;
  if (previewRow.action_type !== 'send_communication' || payloadChannel(previewRow.payload) !== 'email') {
    return null;
  }

  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
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
      reason: 'Retail communication action is not approved or has already been claimed.',
    };
  }

  const action = claimed as RetailActionRow;
  if (action.profile_id) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('retail_reception_profiles')
      .select('id,active,can_send_communications')
      .eq('id', action.profile_id)
      .eq('workspace_id', action.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (profileError || !profile || !profile.active || !profile.can_send_communications) {
      return failClaimedAction(userId, actionId, 'Receptionist profile does not permit communication delivery.');
    }
  }

  let payload;
  try {
    payload = parseRetailEmailPayload(action.payload);
  } catch (error) {
    return failClaimedAction(
      userId,
      actionId,
      error instanceof Error ? error.message : 'Retail email payload is invalid.',
    );
  }

  const { data: communication, error: communicationError } = await supabaseAdmin
    .from('retail_customer_communications')
    .insert({
      user_id: userId,
      workspace_id: action.workspace_id,
      appointment_id: action.appointment_id,
      call_id: action.call_id,
      order_id: action.order_id,
      action_id: action.id,
      direction: 'outbound',
      channel: 'email',
      purpose: payload.purpose,
      recipient: payload.recipient,
      subject: payload.subject,
      body: payload.body,
      scheduled_for: claimedAt,
      status: 'ready',
      metadata: {
        source: 'retail_reception_action',
        provider_delivery_required: true,
        execution_claimed_at: claimedAt,
      },
    })
    .select('id')
    .single();

  if (communicationError || !communication) {
    return failClaimedAction(
      userId,
      actionId,
      communicationError?.message || 'Retail communication ledger entry could not be created.',
    );
  }

  const communicationId = String(communication.id);
  const delivery = await executeApprovedAction(userId, {
    actionType: 'email_send',
    details: {
      to: payload.recipient,
      subject: payload.subject,
      body: payload.body,
      provider: 'auto',
    },
  });

  if (!delivery.ok) {
    return failClaimedAction(
      userId,
      actionId,
      delivery.error || 'Connected email provider delivery failed.',
      communicationId,
      delivery.provider,
    );
  }

  const completedAt = new Date().toISOString();
  const providerMessageId = retailProviderMessageId(delivery.result);
  const { error: communicationFinalizeError } = await supabaseAdmin
    .from('retail_customer_communications')
    .update({
      status: 'sent',
      provider: delivery.provider ?? null,
      provider_message_id: providerMessageId,
      sent_at: completedAt,
      last_error: null,
      metadata: {
        source: 'retail_reception_action',
        provider_delivery_required: false,
        execution_claimed_at: claimedAt,
        delivered_at: completedAt,
      },
      updated_at: completedAt,
    })
    .eq('id', communicationId)
    .eq('user_id', userId)
    .eq('status', 'ready');

  const { error: actionFinalizeError } = await supabaseAdmin
    .from('retail_reception_actions')
    .update({ status: 'executed', executed_at: completedAt, last_error: null, updated_at: completedAt })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'executing');

  if (communicationFinalizeError || actionFinalizeError) {
    return {
      action_id: actionId,
      status: 'executing',
      action_type: 'send_communication',
      delivered: true,
      communication_id: communicationId,
      ...(delivery.provider ? { provider: delivery.provider } : {}),
      reason: 'Email provider accepted delivery, but Blackstar could not fully persist the final delivery state. Automatic retry is blocked to prevent duplicate email.',
    };
  }

  return {
    action_id: actionId,
    status: 'executed',
    action_type: 'send_communication',
    delivered: true,
    communication_id: communicationId,
    ...(delivery.provider ? { provider: delivery.provider } : {}),
  };
}
