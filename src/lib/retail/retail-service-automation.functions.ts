import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import {
  getRetailExternalDeliveryCapabilities,
  tryExecuteRetailConnectedCommunication,
} from '@/lib/retail/retail-connected-delivery.server';
import { getVoiceRuntimeCapabilities } from '@/lib/voice/voice-runtime.server';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };

const uuid = z.string().uuid();
const nullableUuid = z.union([uuid, z.literal(''), z.null()]).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const jsonObject = z.record(z.string(), z.unknown()).optional();

const profileSchema = z.object({
  id: uuid.optional(),
  workspace_id: uuid,
  location_id: nullableUuid,
  name: z.string().trim().min(1).max(120),
  active: z.boolean().optional().default(true),
  greeting: z.string().max(4000).optional().default(''),
  after_hours_message: z.string().max(4000).optional().default(''),
  business_hours: jsonObject,
  knowledge: jsonObject,
  policies: jsonObject,
  escalation_name: optionalText(180),
  escalation_phone: optionalText(80),
  voice_studio_voice: z.string().trim().min(1).max(160).optional().default('alloy'),
  voice_studio_instructions: optionalText(2000),
  answer_hours: z.boolean().optional().default(true),
  answer_location: z.boolean().optional().default(true),
  answer_services: z.boolean().optional().default(true),
  answer_pricing: z.boolean().optional().default(true),
  answer_stock: z.boolean().optional().default(true),
  answer_orders: z.boolean().optional().default(true),
  answer_shipping: z.boolean().optional().default(true),
  answer_policies: z.boolean().optional().default(true),
  can_create_bookings: z.boolean().optional().default(false),
  can_reschedule_bookings: z.boolean().optional().default(false),
  can_cancel_bookings: z.boolean().optional().default(false),
  can_create_followups: z.boolean().optional().default(true),
  can_send_communications: z.boolean().optional().default(false),
});

const actionSchema = z.object({
  workspace_id: uuid,
  profile_id: nullableUuid,
  call_id: nullableUuid,
  appointment_id: nullableUuid,
  order_id: nullableUuid,
  source: z.enum(['staff','ai','voice','sms','email','whatsapp','web','integration']).optional().default('staff'),
  action_type: z.enum(['create_booking','reschedule_booking','cancel_booking','create_followup','send_communication','escalate_to_staff']),
  summary: z.string().trim().min(1).max(2000),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

const communicationSchema = z.object({
  id: uuid.optional(),
  workspace_id: uuid,
  location_id: nullableUuid,
  appointment_id: nullableUuid,
  call_id: nullableUuid,
  order_id: nullableUuid,
  action_id: nullableUuid,
  direction: z.enum(['outbound','internal']).optional().default('outbound'),
  channel: z.enum(['in_app','sms','email','whatsapp','voice']),
  purpose: z.enum(['appointment_confirmation','missed_call','followup','order_update','shipping_update','custom']).optional().default('custom'),
  recipient: z.string().trim().min(1).max(320),
  subject: optionalText(500),
  body: z.string().trim().min(1).max(4000),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['draft','ready','cancelled']).optional().default('draft'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

function nullify(value: string | null | undefined) {
  return value ? value : null;
}

function cleanJsonObject(value: Record<string, unknown> | undefined) {
  return value ?? {};
}

export const getRetailServiceAutomation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const externalDelivery = await getRetailExternalDeliveryCapabilities(context.userId);
    const queries = await Promise.all([
      sb.from('retail_reception_profiles').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }),
      sb.from('retail_reception_actions').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(200),
      sb.from('retail_customer_communications').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(200),
      sb.from('retail_locations').select('id,name,kind,active').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_appointments').select('id,customer_name,customer_phone,customer_email,starts_at,ends_at,status,service_item_id,staff_id,location_id').eq('workspace_id', wid).order('starts_at', { ascending: false }).limit(300),
      sb.from('retail_orders').select('id,order_number,customer_name,customer_phone,customer_email,status,fulfilment_status,tracking_number,carrier').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(300),
      sb.from('retail_call_inbox').select('id,customer_name,phone,reason,summary,status,needs_follow_up,appointment_id,source,received_at').eq('workspace_id', wid).order('received_at', { ascending: false }).limit(200),
      sb.from('retail_catalog_items').select('id,name,item_type,sale_price,currency,service_duration_minutes,track_inventory,active').eq('workspace_id', wid).eq('active', true).order('name'),
    ]);
    const error = queries.find((query: any) => query.error)?.error;
    if (error) throw new Error(error.message);
    const [profiles, actions, communications, locations, appointments, orders, calls, catalog] = queries.map((query: any) => query.data ?? []);
    return {
      profiles,
      actions,
      communications,
      locations,
      appointments,
      orders,
      calls,
      catalog,
      voice: getVoiceRuntimeCapabilities(),
      externalDelivery,
    };
  });

export const saveRetailReceptionProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => profileSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      workspace_id: data.workspace_id,
      location_id: nullify(data.location_id),
      name: data.name,
      active: data.active,
      greeting: data.greeting,
      after_hours_message: data.after_hours_message,
      business_hours: cleanJsonObject(data.business_hours),
      knowledge: cleanJsonObject(data.knowledge),
      policies: cleanJsonObject(data.policies),
      escalation_name: nullify(data.escalation_name),
      escalation_phone: nullify(data.escalation_phone),
      voice_studio_voice: data.voice_studio_voice,
      voice_studio_instructions: nullify(data.voice_studio_instructions),
      answer_hours: data.answer_hours,
      answer_location: data.answer_location,
      answer_services: data.answer_services,
      answer_pricing: data.answer_pricing,
      answer_stock: data.answer_stock,
      answer_orders: data.answer_orders,
      answer_shipping: data.answer_shipping,
      answer_policies: data.answer_policies,
      can_create_bookings: data.can_create_bookings,
      can_reschedule_bookings: data.can_reschedule_bookings,
      can_cancel_bookings: data.can_cancel_bookings,
      can_create_followups: data.can_create_followups,
      can_send_communications: data.can_send_communications,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: out, error } = await sb.from('retail_reception_profiles').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await sb.from('retail_reception_profiles').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const queueRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_reception_actions').insert({
      user_id: context.userId,
      workspace_id: data.workspace_id,
      profile_id: nullify(data.profile_id),
      call_id: nullify(data.call_id),
      appointment_id: nullify(data.appointment_id),
      order_id: nullify(data.order_id),
      source: data.source,
      action_type: data.action_type,
      status: 'pending_review',
      summary: data.summary,
      payload: data.payload,
    }).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const reviewRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid, decision: z.enum(['approved','dismissed']) }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_reception_actions')
      .update({ status: data.decision, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', context.userId)
      .eq('status', 'pending_review')
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const executeRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const connected = await tryExecuteRetailConnectedCommunication(context.userId, data.id);
    if (connected) {
      const providerAccepted = Boolean(connected.provider_accepted);
      await writeAudit({
        userId: context.userId,
        action: 'retail.communication.connected_delivery',
        targetType: 'retail_reception_action',
        targetId: data.id,
        status: connected.delivered || providerAccepted ? 'success' : 'failed',
        metadata: {
          provider: connected.provider ?? null,
          providerAccepted,
          providerStatus: connected.provider_status ?? null,
          delivered: connected.delivered,
          communicationId: connected.communication_id ?? null,
          executionStatus: connected.status,
          reason: connected.reason ?? null,
        },
      });
      return connected;
    }

    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_execute_reception_action', { p_action_id: data.id });
    if (error) throw new Error(error.message);
    return out as { action_id: string; status: string; action_type?: string; target_id?: string | null; reason?: string; communication_id?: string; delivered?: boolean | null };
  });

export const saveRetailCustomerCommunication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => communicationSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      workspace_id: data.workspace_id,
      location_id: nullify(data.location_id),
      appointment_id: nullify(data.appointment_id),
      call_id: nullify(data.call_id),
      order_id: nullify(data.order_id),
      action_id: nullify(data.action_id),
      direction: data.direction,
      channel: data.channel,
      purpose: data.purpose,
      recipient: data.recipient,
      subject: nullify(data.subject),
      body: data.body,
      scheduled_for: data.scheduled_for ?? new Date().toISOString(),
      status: data.status,
      metadata: data.metadata,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: out, error } = await sb.from('retail_customer_communications').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await sb.from('retail_customer_communications').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return out;
  });
