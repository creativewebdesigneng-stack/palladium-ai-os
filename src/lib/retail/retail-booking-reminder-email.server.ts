import { createHash, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { executeApprovedAction } from '@/lib/integrations/approved-action.server';
import { retailProviderMessageId } from './retail-connected-delivery';

type AdminSb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as AdminSb;

const CREDENTIAL = 'retail_booking_reminder_dispatch';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReminderResult = {
  reminder_id: string;
  status: 'sent' | 'skipped' | 'failed' | 'reconciled';
  provider?: string;
  provider_message_id?: string;
  reason?: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isValidRetailBookingReminderWorkerToken(token: string) {
  const supplied = token.trim();
  if (supplied.length < 32 || supplied.length > 512) return false;
  const { data, error } = await adminSb
    .from('retail_scheduler_credentials')
    .select('token_sha256,enabled')
    .eq('name', CREDENTIAL)
    .maybeSingle();
  if (error || !data?.enabled || typeof data.token_sha256 !== 'string') return false;
  return safeEqual(sha256(supplied), data.token_sha256);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().slice(0, 254) : '';
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

function formatAppointmentTime(value: string, timezone: string) {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone || 'Europe/London',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

async function updateReminder(id: string, patch: Record<string, unknown>) {
  const { error } = await adminSb
    .from('retail_booking_reminders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function connectedEmailProvider(userId: string) {
  const { data, error } = await adminSb
    .from('integrations')
    .select('provider')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .in('provider', ['google', 'microsoft', 'nango_google', 'nango_microsoft']);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function executeRetailBookingReminderEmail(reminderId: string): Promise<ReminderResult> {
  if (!UUID.test(reminderId)) {
    return { reminder_id: reminderId.slice(0, 80), status: 'failed', reason: 'invalid_reminder_id' };
  }

  const { data: reminder, error: reminderError } = await adminSb
    .from('retail_booking_reminders')
    .select('id,user_id,workspace_id,appointment_id,channel,status,scheduled_for,last_attempt_at,next_attempt_at,attempt_count,max_attempts,provider_message_id,sent_at')
    .eq('id', reminderId)
    .maybeSingle();
  if (reminderError) throw new Error(reminderError.message);
  if (!reminder) return { reminder_id: reminderId, status: 'failed', reason: 'reminder_not_found' };
  if (reminder.channel !== 'email') return { reminder_id: reminderId, status: 'failed', reason: 'reminder_channel_not_email' };

  if (reminder.status === 'sent') {
    return {
      reminder_id: reminderId,
      status: 'reconciled',
      ...(reminder.provider_message_id ? { provider_message_id: String(reminder.provider_message_id) } : {}),
    };
  }
  if (reminder.status !== 'scheduled') {
    return { reminder_id: reminderId, status: 'failed', reason: `reminder_not_sendable:${String(reminder.status)}` };
  }

  const nowMs = Date.now();
  const scheduledMs = Date.parse(String(reminder.scheduled_for));
  const claimedMs = Date.parse(String(reminder.last_attempt_at || ''));
  const leaseUntilMs = Date.parse(String(reminder.next_attempt_at || ''));
  if (!Number.isFinite(scheduledMs) || scheduledMs > nowMs) {
    return { reminder_id: reminderId, status: 'failed', reason: 'reminder_not_due' };
  }
  if (!Number.isFinite(claimedMs) || !Number.isFinite(leaseUntilMs) || claimedMs > nowMs || leaseUntilMs <= nowMs) {
    return { reminder_id: reminderId, status: 'failed', reason: 'reminder_not_claimed_by_worker' };
  }

  const [{ data: appointment, error: appointmentError }, { data: workspace, error: workspaceError }] = await Promise.all([
    adminSb
      .from('retail_appointments')
      .select('id,customer_name,customer_email,starts_at,status,service_item_id')
      .eq('id', reminder.appointment_id)
      .eq('user_id', reminder.user_id)
      .maybeSingle(),
    adminSb
      .from('retail_workspaces')
      .select('id,business_name,timezone')
      .eq('id', reminder.workspace_id)
      .eq('user_id', reminder.user_id)
      .maybeSingle(),
  ]);
  if (appointmentError) throw new Error(appointmentError.message);
  if (workspaceError) throw new Error(workspaceError.message);
  if (!appointment || !workspace) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'appointment_or_workspace_missing' });
    return { reminder_id: reminderId, status: 'skipped', reason: 'appointment_or_workspace_missing' };
  }
  if (['completed', 'cancelled', 'no_show'].includes(String(appointment.status))) {
    const reason = `appointment_${String(appointment.status)}`;
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: reason });
    return { reminder_id: reminderId, status: 'skipped', reason };
  }
  if (Date.parse(String(appointment.starts_at)) <= nowMs) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'appointment_already_started' });
    return { reminder_id: reminderId, status: 'skipped', reason: 'appointment_already_started' };
  }

  const recipient = validEmail(appointment.customer_email);
  if (!recipient) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'customer_email_missing_or_invalid' });
    return { reminder_id: reminderId, status: 'skipped', reason: 'customer_email_missing_or_invalid' };
  }
  if (!(await connectedEmailProvider(String(reminder.user_id)))) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'provider_not_configured:email' });
    return { reminder_id: reminderId, status: 'skipped', reason: 'provider_not_configured:email' };
  }

  const { data: existing, error: existingError } = await adminSb
    .from('retail_customer_communications')
    .select('id,status,provider,provider_message_id,metadata,sent_at')
    .eq('user_id', reminder.user_id)
    .eq('workspace_id', reminder.workspace_id)
    .eq('appointment_id', reminder.appointment_id)
    .contains('metadata', { retail_booking_reminder_id: reminderId })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing?.status === 'sent') {
    const messageId = existing.provider_message_id || `email-ledger:${existing.id}`;
    await updateReminder(reminderId, {
      status: 'sent',
      next_attempt_at: null,
      sent_at: reminder.sent_at || existing.sent_at || new Date().toISOString(),
      provider_message_id: messageId,
      last_error: null,
    });
    return {
      reminder_id: reminderId,
      status: 'reconciled',
      ...(existing.provider ? { provider: String(existing.provider) } : {}),
      provider_message_id: String(messageId),
    };
  }

  const existingMetadata = objectValue(existing?.metadata);
  if (existing?.status === 'ready' && existingMetadata['provider_call_started_at']) {
    await updateReminder(reminderId, {
      status: 'failed',
      next_attempt_at: null,
      last_error: 'provider_outcome_unknown:existing_inflight_email',
    });
    return { reminder_id: reminderId, status: 'failed', reason: 'provider_outcome_unknown' };
  }

  let serviceName = '';
  if (appointment.service_item_id) {
    const { data: service, error: serviceError } = await adminSb
      .from('retail_catalog_items')
      .select('name')
      .eq('id', appointment.service_item_id)
      .eq('workspace_id', reminder.workspace_id)
      .eq('user_id', reminder.user_id)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    serviceName = typeof service?.name === 'string' ? service.name.trim().slice(0, 100) : '';
  }

  const businessName = String(workspace.business_name || 'the business').trim().slice(0, 120) || 'the business';
  const customerName = String(appointment.customer_name || 'there').trim().slice(0, 100) || 'there';
  const when = formatAppointmentTime(String(appointment.starts_at), String(workspace.timezone || 'Europe/London'));
  const subject = `Appointment reminder — ${businessName}`.slice(0, 200);
  const body = `Hi ${customerName},\n\nThis is a reminder that your appointment${serviceName ? ` for ${serviceName}` : ''} at ${businessName} is ${when}.\n\nIf you need to change your appointment, please contact ${businessName}.`.slice(0, 4000);
  const startedAt = new Date().toISOString();

  const { data: communication, error: communicationError } = await adminSb
    .from('retail_customer_communications')
    .insert({
      user_id: reminder.user_id,
      workspace_id: reminder.workspace_id,
      appointment_id: reminder.appointment_id,
      direction: 'outbound',
      channel: 'email',
      purpose: 'appointment_confirmation',
      recipient,
      subject,
      body,
      scheduled_for: reminder.scheduled_for,
      status: 'ready',
      metadata: {
        source: 'retail_booking_reminder',
        retail_booking_reminder_id: reminderId,
        provider_delivery_required: true,
        provider_accepted: false,
        delivery_confirmed: null,
        provider_call_started_at: startedAt,
        attempt: reminder.attempt_count,
      },
    })
    .select('id')
    .single();
  if (communicationError || !communication) {
    throw new Error(communicationError?.message || 'communication_insert_failed');
  }

  const delivery = await executeApprovedAction(String(reminder.user_id), {
    actionType: 'email_send',
    details: { to: recipient, subject, body, provider: 'auto' },
  });

  if (!delivery.ok) {
    const reason = (delivery.error || 'connected_email_delivery_failed').slice(0, 1800);
    const failedAt = new Date().toISOString();
    await adminSb
      .from('retail_customer_communications')
      .update({
        status: 'failed',
        provider: delivery.provider ?? null,
        last_error: reason,
        metadata: {
          source: 'retail_booking_reminder',
          retail_booking_reminder_id: reminderId,
          provider_delivery_required: false,
          provider_accepted: false,
          delivery_confirmed: null,
          provider_call_started_at: startedAt,
          provider_outcome_unknown: true,
          attempt: reminder.attempt_count,
        },
        updated_at: failedAt,
      })
      .eq('id', communication.id)
      .eq('user_id', reminder.user_id);
    await updateReminder(reminderId, { status: 'failed', next_attempt_at: null, last_error: reason });
    return {
      reminder_id: reminderId,
      status: 'failed',
      ...(delivery.provider ? { provider: delivery.provider } : {}),
      reason,
    };
  }

  const completedAt = new Date().toISOString();
  const providerMessageId = retailProviderMessageId(delivery.result);
  const reminderMessageId = providerMessageId || `email-ledger:${String(communication.id)}`;
  const { error: finalizeError } = await adminSb
    .from('retail_customer_communications')
    .update({
      status: 'sent',
      provider: delivery.provider ?? null,
      provider_message_id: providerMessageId,
      sent_at: completedAt,
      last_error: null,
      metadata: {
        source: 'retail_booking_reminder',
        retail_booking_reminder_id: reminderId,
        provider_delivery_required: false,
        provider_accepted: true,
        delivery_confirmed: null,
        provider_call_started_at: startedAt,
        provider_accepted_at: completedAt,
        attempt: reminder.attempt_count,
      },
      updated_at: completedAt,
    })
    .eq('id', communication.id)
    .eq('user_id', reminder.user_id)
    .eq('status', 'ready');

  if (finalizeError) {
    await updateReminder(reminderId, {
      status: 'failed',
      next_attempt_at: null,
      provider_message_id: reminderMessageId,
      last_error: 'provider_accepted_but_ledger_finalize_failed',
    });
    return {
      reminder_id: reminderId,
      status: 'failed',
      ...(delivery.provider ? { provider: delivery.provider } : {}),
      provider_message_id: reminderMessageId,
      reason: 'provider_accepted_but_ledger_finalize_failed',
    };
  }

  await updateReminder(reminderId, {
    status: 'sent',
    next_attempt_at: null,
    sent_at: completedAt,
    provider_message_id: reminderMessageId,
    last_error: null,
  });
  return {
    reminder_id: reminderId,
    status: 'sent',
    ...(delivery.provider ? { provider: delivery.provider } : {}),
    provider_message_id: reminderMessageId,
  };
}