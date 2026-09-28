import { createHash, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { tryExecuteRetailConnectedCommunication } from './retail-connected-delivery.server';

type AdminSb = { from: (table: string) => any };
const adminSb = supabaseAdmin as unknown as AdminSb;
const CREDENTIAL = 'retail_booking_reminder_dispatch';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function validEmail(value: unknown) {
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

export async function executeRetailBookingReminderEmail(reminderId: string) {
  if (!UUID.test(reminderId)) {
    return { reminder_id: reminderId.slice(0, 80), status: 'failed' as const, reason: 'invalid_reminder_id' };
  }

  const { data: reminder, error: reminderError } = await adminSb
    .from('retail_booking_reminders')
    .select('id,user_id,workspace_id,appointment_id,channel,status,scheduled_for,last_attempt_at,next_attempt_at,attempt_count,max_attempts,provider_message_id,sent_at,created_at')
    .eq('id', reminderId)
    .maybeSingle();
  if (reminderError) throw new Error(reminderError.message);
  if (!reminder) return { reminder_id: reminderId, status: 'failed' as const, reason: 'reminder_not_found' };
  if (reminder.channel !== 'email') return { reminder_id: reminderId, status: 'failed' as const, reason: 'reminder_channel_not_email' };

  if (reminder.status === 'sent') {
    return {
      reminder_id: reminderId,
      status: 'reconciled' as const,
      provider_message_id: reminder.provider_message_id ? String(reminder.provider_message_id) : null,
    };
  }
  if (reminder.status !== 'scheduled') {
    return { reminder_id: reminderId, status: 'failed' as const, reason: `reminder_not_sendable:${String(reminder.status)}` };
  }

  const nowMs = Date.now();
  const scheduledMs = Date.parse(String(reminder.scheduled_for));
  const claimedMs = Date.parse(String(reminder.last_attempt_at || ''));
  const leaseUntilMs = Date.parse(String(reminder.next_attempt_at || ''));
  if (!Number.isFinite(scheduledMs) || scheduledMs > nowMs) {
    return { reminder_id: reminderId, status: 'failed' as const, reason: 'reminder_not_due' };
  }
  if (!Number.isFinite(claimedMs) || !Number.isFinite(leaseUntilMs) || claimedMs > nowMs || leaseUntilMs <= nowMs) {
    return { reminder_id: reminderId, status: 'failed' as const, reason: 'reminder_not_claimed_by_worker' };
  }

  const [{ data: appointment, error: appointmentError }, { data: workspace, error: workspaceError }] = await Promise.all([
    adminSb.from('retail_appointments')
      .select('id,customer_name,customer_email,starts_at,status,service_item_id')
      .eq('id', reminder.appointment_id).eq('user_id', reminder.user_id).maybeSingle(),
    adminSb.from('retail_workspaces')
      .select('id,business_name,timezone')
      .eq('id', reminder.workspace_id).eq('user_id', reminder.user_id).maybeSingle(),
  ]);
  if (appointmentError) throw new Error(appointmentError.message);
  if (workspaceError) throw new Error(workspaceError.message);
  if (!appointment || !workspace) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'appointment_or_workspace_missing' });
    return { reminder_id: reminderId, status: 'skipped' as const, reason: 'appointment_or_workspace_missing' };
  }
  if (['completed','cancelled','no_show'].includes(String(appointment.status))) {
    const reason = `appointment_${String(appointment.status)}`;
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: reason });
    return { reminder_id: reminderId, status: 'skipped' as const, reason };
  }
  if (Date.parse(String(appointment.starts_at)) <= nowMs) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'appointment_already_started' });
    return { reminder_id: reminderId, status: 'skipped' as const, reason: 'appointment_already_started' };
  }

  const recipient = validEmail(appointment.customer_email);
  if (!recipient) {
    await updateReminder(reminderId, { status: 'skipped', next_attempt_at: null, last_error: 'customer_email_missing_or_invalid' });
    return { reminder_id: reminderId, status: 'skipped' as const, reason: 'customer_email_missing_or_invalid' };
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
    return { reminder_id: reminderId, status: 'reconciled' as const, provider: existing.provider ?? null, provider_message_id: messageId };
  }
  if (existing) {
    await updateReminder(reminderId, {
      status: 'failed',
      next_attempt_at: null,
      last_error: 'provider_outcome_unknown:existing_booking_reminder_email',
    });
    return { reminder_id: reminderId, status: 'failed' as const, reason: 'provider_outcome_unknown' };
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
  // The authenticated owner explicitly scheduled this reminder. Materialize that
  // durable intent as the existing Retail approval primitive so connected email
  // delivery still has to claim an approved Retail action before provider I/O.
  const loadReminderAction = async () => {
    const { data, error } = await adminSb
      .from('retail_reception_actions')
      .select('id,status,last_error,executed_at')
      .eq('user_id', reminder.user_id)
      .eq('workspace_id', reminder.workspace_id)
      .eq('appointment_id', reminder.appointment_id)
      .eq('action_type', 'send_communication')
      .contains('payload', { retail_booking_reminder_id: reminderId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };

  let action = await loadReminderAction();
  if (!action) {
    const { data: created, error: createError } = await adminSb
      .from('retail_reception_actions')
      .insert({
        user_id: reminder.user_id,
        workspace_id: reminder.workspace_id,
        appointment_id: reminder.appointment_id,
        source: 'integration',
        action_type: 'send_communication',
        status: 'approved',
        summary: `Send the owner-scheduled email reminder for ${customerName}`.slice(0, 2000),
        payload: {
          channel: 'email',
          purpose: 'appointment_confirmation',
          recipient,
          subject,
          body,
          retail_booking_reminder_id: reminderId,
          authorization_source: 'owner_scheduled_booking_reminder',
          scheduled_for: reminder.scheduled_for,
        },
        reviewed_at: reminder.created_at || new Date().toISOString(),
      })
      .select('id,status,last_error,executed_at')
      .single();

    if (createError?.code === '23505') {
      action = await loadReminderAction();
    } else if (createError) {
      throw new Error(createError.message);
    } else {
      action = created;
    }
  }

  if (!action) throw new Error('booking_reminder_retail_action_unavailable');

  if (action.status !== 'approved') {
    const refreshed = await adminSb
      .from('retail_customer_communications')
      .select('id,status,provider,provider_message_id,sent_at')
      .eq('user_id', reminder.user_id)
      .eq('action_id', action.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (refreshed.error) throw new Error(refreshed.error.message);
    if (action.status === 'executed' && refreshed.data?.status === 'sent') {
      const messageId = refreshed.data.provider_message_id || `email-ledger:${refreshed.data.id}`;
      await updateReminder(reminderId, {
        status: 'sent',
        next_attempt_at: null,
        sent_at: reminder.sent_at || refreshed.data.sent_at || new Date().toISOString(),
        provider_message_id: messageId,
        last_error: null,
      });
      return {
        reminder_id: reminderId,
        status: 'reconciled' as const,
        provider: refreshed.data.provider ?? null,
        provider_message_id: messageId,
      };
    }
    const reason = `provider_outcome_unknown:retail_action_${String(action.status)}`;
    await updateReminder(reminderId, { status: 'failed', next_attempt_at: null, last_error: reason });
    return { reminder_id: reminderId, status: 'failed' as const, reason: 'provider_outcome_unknown' };
  }

  const delivery = await tryExecuteRetailConnectedCommunication(String(reminder.user_id), String(action.id));
  if (!delivery) {
    await updateReminder(reminderId, {
      status: 'failed',
      next_attempt_at: null,
      last_error: 'connected_email_delivery_unavailable',
    });
    return { reminder_id: reminderId, status: 'failed' as const, reason: 'connected_email_delivery_unavailable' };
  }

  const { data: communication, error: communicationError } = await adminSb
    .from('retail_customer_communications')
    .select('id,status,provider,provider_message_id,sent_at,last_error')
    .eq('user_id', reminder.user_id)
    .eq('action_id', action.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (communicationError) throw new Error(communicationError.message);

  if (delivery.status === 'executed' && communication?.status === 'sent') {
    const completedAt = communication.sent_at || new Date().toISOString();
    const reminderMessageId = communication.provider_message_id || `email-ledger:${String(communication.id)}`;
    await updateReminder(reminderId, {
      status: 'sent',
      next_attempt_at: null,
      sent_at: completedAt,
      provider_message_id: reminderMessageId,
      last_error: null,
    });
    return {
      reminder_id: reminderId,
      status: 'sent' as const,
      provider: communication.provider ?? delivery.provider ?? null,
      provider_message_id: reminderMessageId,
    };
  }

  const reason = (
    delivery.provider_accepted
      ? 'provider_outcome_unknown:provider_accepted_before_retail_finalize'
      : delivery.reason || communication?.last_error || 'connected_email_delivery_failed'
  ).slice(0, 1800);
  await updateReminder(reminderId, {
    status: 'failed',
    next_attempt_at: null,
    ...(communication?.provider_message_id ? { provider_message_id: communication.provider_message_id } : {}),
    last_error: reason,
  });
  return {
    reminder_id: reminderId,
    status: 'failed' as const,
    provider: communication?.provider ?? delivery.provider ?? null,
    reason,
  };
}
