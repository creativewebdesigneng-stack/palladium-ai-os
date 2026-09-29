import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const bridge=readFileSync(new URL('./retail-booking-reminder-email.server.ts',import.meta.url),'utf8');
const route=readFileSync(new URL('../../routes/api/internal/retail-booking-reminder-email.ts',import.meta.url),'utf8');
const worker=readFileSync('supabase/functions/retail-booking-reminder-dispatch/index.ts','utf8');
const delivery=readFileSync(new URL('./retail-connected-delivery.server.ts',import.meta.url),'utf8');
const migration=readFileSync('supabase/migrations/20260928183500_retail_booking_reminder_email_dedupe.sql','utf8');

describe('Retail connected email booking reminders',()=>{
  it('authenticates the app bridge with the existing scheduler credential',()=>{
    expect(bridge).toContain("retail_booking_reminder_dispatch");
    expect(route).toContain('isValidRetailBookingReminderWorkerToken');
    expect(route).toContain("authorization.startsWith('Bearer ')");
  });

  it('materializes owner-scheduled reminders through the existing governed Retail delivery path',()=>{
    expect(bridge).toContain('tryExecuteRetailConnectedCommunication');
    expect(bridge).toContain("status: 'approved'");
    expect(bridge).toContain("authorization_source: 'owner_scheduled_booking_reminder'");
    expect(bridge).toContain('provider_outcome_unknown');
    expect(bridge).not.toContain('executeApprovedAction');
    expect(bridge).not.toContain('localStorage');
    expect(bridge).toContain(".eq('user_id', reminder.user_id)");
    expect(bridge).toContain(".eq('workspace_id', reminder.workspace_id)");
    expect(bridge).toContain(".eq('appointment_id', reminder.appointment_id)");
    expect(delivery).toContain('payloadBookingReminderId');
    expect(delivery).toContain('retail_booking_reminder_id');
    expect(bridge).toContain(".eq('id', reminder.appointment_id).eq('user_id', reminder.user_id).eq('workspace_id', reminder.workspace_id)");
    expect(worker).toContain('.eq("id", reminder.appointment_id).eq("user_id", reminder.user_id).eq("workspace_id", reminder.workspace_id)');
  });

  it('routes only email reminders through the bridge without replacing existing channels',()=>{
    expect(worker).toContain('dispatchConnectedEmailReminder');
    expect(worker).toContain('dispatchTwilioReminder');
    expect(worker).toContain('reminder.channel === "email"');
    expect(worker).toContain('deliveryCapabilities()');
  });

  it('enforces one governed action and communication ledger row per booking reminder',()=>{
    expect(migration).toContain('create unique index if not exists retail_customer_communications_booking_reminder_uidx');
    expect(migration).toContain('create unique index if not exists retail_reception_actions_booking_reminder_uidx');
    expect(migration).toContain("user_id, (metadata ->> 'retail_booking_reminder_id')");
    expect(migration).toContain("user_id, (payload ->> 'retail_booking_reminder_id')");
    expect(migration).toContain('a.workspace_id = retail_booking_reminders.workspace_id');
    expect(migration).not.toContain('a.workspace_id = a.workspace_id');
  });
});
