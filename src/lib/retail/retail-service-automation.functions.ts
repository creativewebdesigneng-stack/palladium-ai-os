import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid = z.string().uuid();
const optText = (max: number) => z.string().trim().max(max).optional();

const profileSchema = z.object({
  workspace_id: uuid,
  active: z.boolean().optional(),
  greeting: optText(2000),
  business_hours: z.record(z.string(), z.unknown()).optional(),
  knowledge: z.record(z.string(), z.unknown()).optional(),
  policies: z.record(z.string(), z.unknown()).optional(),
  escalation_name: optText(180),
  escalation_phone: optText(80),
  default_channel: z.enum(['sms','email','voice','whatsapp']).optional(),
  appointment_reminders: z.boolean().optional(),
  first_reminder_hours: z.coerce.number().int().min(1).max(720).optional(),
  second_reminder_hours: z.coerce.number().int().min(1).max(168).nullish(),
  no_show_followup: z.boolean().optional(),
  ai_actions_enabled: z.boolean().optional(),
  notes: optText(8000),
});

const returnItemSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, return_id: uuid, item_id: uuid, location_id: uuid.nullish(),
  quantity: z.coerce.number().positive().max(1_000_000_000),
  condition: z.enum(['sellable','opened','damaged','defective','unknown']).optional(),
  disposition: z.enum(['restock','quarantine','discard','return_to_supplier','inspect']).optional(),
  notes: optText(4000),
});

const actionSchema = z.object({
  workspace_id: uuid, call_id: uuid.nullish(), appointment_id: uuid.nullish(), order_id: uuid.nullish(),
  action_type: z.enum(['create_booking','reschedule_booking','cancel_booking','callback','order_status_reply','product_or_service_query','custom']),
  summary: z.string().trim().min(1).max(2000), payload: z.record(z.string(), z.unknown()).optional(),
});

const communicationSchema = z.object({
  workspace_id: uuid, appointment_id: uuid.nullish(), call_id: uuid.nullish(), order_id: uuid.nullish(), action_id: uuid.nullish(),
  channel: z.enum(['sms','email','voice','whatsapp']),
  purpose: z.enum(['appointment_reminder_1','appointment_reminder_2','appointment_confirmation','no_show_followup','callback','order_update','custom']),
  recipient: z.string().trim().min(1).max(320), subject: optText(500), body: z.string().trim().min(1).max(4000),
  scheduled_for: z.string().datetime({ offset: true }).optional(), status: z.enum(['draft','ready']).optional(), metadata: z.record(z.string(), z.unknown()).optional(),
});

function clean<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === '' ? null : value]));
}

async function verifyOwned(admin: any, table: string, id: string | null | undefined, userId: string, workspaceId: string) {
  if (!id) return;
  const { data, error } = await admin.from(table).select('id').eq('id', id).eq('user_id', userId).eq('workspace_id', workspaceId).maybeSingle();
  if (error || !data) throw new Error(`Referenced ${table.replace(/^retail_/, '').replaceAll('_', ' ')} does not belong to this Retail workspace.`);
}

export const getRetailServiceAutomation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_reception_profiles').select('*').eq('workspace_id', wid).maybeSingle(),
      sb.from('retail_reception_actions').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(300),
      sb.from('retail_customer_communications').select('*').eq('workspace_id', wid).order('scheduled_for', { ascending: false }).limit(500),
      sb.from('retail_return_items').select('*').eq('workspace_id', wid).order('created_at', { ascending: true }).limit(1000),
      sb.from('retail_returns').select('*').eq('workspace_id', wid).order('requested_at', { ascending: false }).limit(300),
      sb.from('retail_catalog_items').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_locations').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_appointments').select('*').eq('workspace_id', wid).order('starts_at', { ascending: false }).limit(500),
      sb.from('retail_call_inbox').select('*').eq('workspace_id', wid).order('received_at', { ascending: false }).limit(300),
      sb.from('retail_orders').select('*').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(300),
    ]);
    const error = queries.find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const [profileQ, actionsQ, communicationsQ, returnItemsQ, returnsQ, catalogQ, locationsQ, appointmentsQ, callsQ, ordersQ] = queries;
    const communications = communicationsQ.data ?? [];
    const now = Date.now();
    return {
      profile: profileQ.data ?? null,
      actions: actionsQ.data ?? [], communications, returnItems: returnItemsQ.data ?? [], returns: returnsQ.data ?? [],
      catalog: catalogQ.data ?? [], locations: locationsQ.data ?? [], appointments: appointmentsQ.data ?? [], calls: callsQ.data ?? [], orders: ordersQ.data ?? [],
      dashboard: {
        pendingActions: (actionsQ.data ?? []).filter((x: any) => x.status === 'pending_review').length,
        approvedActions: (actionsQ.data ?? []).filter((x: any) => x.status === 'approved').length,
        dueCommunications: communications.filter((x: any) => x.status === 'ready' && new Date(x.scheduled_for).getTime() <= now).length,
        scheduledCommunications: communications.filter((x: any) => x.status === 'ready' && new Date(x.scheduled_for).getTime() > now).length,
        restockableReturns: (returnsQ.data ?? []).filter((x: any) => x.restock && ['received','refunded'].includes(x.status)).length,
      },
    };
  });

export const saveRetailReceptionProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => profileSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = clean({ ...data, user_id: context.userId, updated_at: new Date().toISOString() });
    const { data: out, error } = await sb.from('retail_reception_profiles').upsert(row, { onConflict: 'workspace_id' }).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const saveRetailReturnItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => returnItemSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { id, ...values } = data;
    if (id) {
      const { data: out, error } = await sb.from('retail_return_items').update(clean({ ...values, updated_at: new Date().toISOString() }))
        .eq('id', id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await sb.from('retail_return_items').insert(clean({ ...values, user_id: context.userId })).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteRetailReturnItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('retail_return_items').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const processRetailReturnRestock = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ return_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_process_return_restock', { p_return_id: data.return_id });
    if (error) throw new Error(error.message);
    return out;
  });

export const createRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_reception_actions').insert(clean({
      ...data, user_id: context.userId, requested_by: 'manual', status: 'pending_review', payload: data.payload ?? {},
    })).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const reviewRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid, status: z.enum(['pending_review','approved','dismissed']) }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_reception_actions').update({ status: data.status, updated_at: new Date().toISOString() })
      .eq('id', data.id).eq('user_id', context.userId).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const executeRetailReceptionAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const admin = supabaseAdmin as any;
    const { data: action, error: loadError } = await admin.from('retail_reception_actions').select('*').eq('id', data.id).eq('user_id', context.userId).single();
    if (loadError || !action) throw new Error('Reception action not found.');
    if (action.status !== 'approved') throw new Error('Reception action must be approved before execution.');

    try {
      let result: Record<string, unknown> = { action: action.action_type };
      const payload = action.payload ?? {};
      if (action.action_type === 'create_booking') {
        const p = z.object({
          customer_name: z.string().trim().min(1).max(180), customer_phone: optText(80), customer_email: optText(240),
          starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }).nullish(),
          location_id: uuid.nullish(), service_item_id: uuid.nullish(), staff_id: uuid.nullish(), notes: optText(5000),
        }).parse(payload);
        await verifyOwned(admin, 'retail_locations', p.location_id, context.userId, action.workspace_id);
        await verifyOwned(admin, 'retail_catalog_items', p.service_item_id, context.userId, action.workspace_id);
        await verifyOwned(admin, 'retail_staff', p.staff_id, context.userId, action.workspace_id);
        const { data: appointment, error } = await admin.from('retail_appointments').insert(clean({
          user_id: context.userId, workspace_id: action.workspace_id, location_id: p.location_id ?? null,
          service_item_id: p.service_item_id ?? null, staff_id: p.staff_id ?? null, customer_name: p.customer_name,
          customer_phone: p.customer_phone ?? null, customer_email: p.customer_email ?? null, starts_at: p.starts_at,
          ends_at: p.ends_at ?? null, status: 'booked', source: 'ai', notes: p.notes ?? null,
        })).select().single();
        if (error) throw new Error(error.message);
        result = { ...result, appointment_id: appointment.id };
      } else if (action.action_type === 'reschedule_booking') {
        if (!action.appointment_id) throw new Error('No appointment is linked to this action.');
        const p = z.object({ starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }).nullish() }).parse(payload);
        const { error } = await admin.from('retail_appointments').update({ starts_at: p.starts_at, ends_at: p.ends_at ?? null, updated_at: new Date().toISOString() })
          .eq('id', action.appointment_id).eq('user_id', context.userId).eq('workspace_id', action.workspace_id);
        if (error) throw new Error(error.message);
        result = { ...result, appointment_id: action.appointment_id };
      } else if (action.action_type === 'cancel_booking') {
        if (!action.appointment_id) throw new Error('No appointment is linked to this action.');
        const { error } = await admin.from('retail_appointments').update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', action.appointment_id).eq('user_id', context.userId).eq('workspace_id', action.workspace_id);
        if (error) throw new Error(error.message);
        result = { ...result, appointment_id: action.appointment_id };
      } else if (action.action_type === 'callback') {
        if (!action.call_id) throw new Error('No call record is linked to this action.');
        const { error } = await admin.from('retail_call_inbox').update({ needs_follow_up: true, status: 'follow_up', updated_at: new Date().toISOString() })
          .eq('id', action.call_id).eq('user_id', context.userId).eq('workspace_id', action.workspace_id);
        if (error) throw new Error(error.message);
        result = { ...result, call_id: action.call_id };
      } else if (['order_status_reply','product_or_service_query','custom'].includes(action.action_type)) {
        const p = z.object({
          channel: z.enum(['sms','email','voice','whatsapp']), recipient: z.string().trim().min(1).max(320),
          body: z.string().trim().min(1).max(4000), subject: optText(500), scheduled_for: z.string().datetime({ offset: true }).optional(),
        }).parse(payload);
        const { data: communication, error } = await admin.from('retail_customer_communications').insert(clean({
          user_id: context.userId, workspace_id: action.workspace_id, call_id: action.call_id ?? null,
          order_id: action.order_id ?? null, appointment_id: action.appointment_id ?? null, action_id: action.id,
          channel: p.channel, purpose: action.action_type === 'order_status_reply' ? 'order_update' : 'custom',
          recipient: p.recipient, subject: p.subject ?? null, body: p.body,
          scheduled_for: p.scheduled_for ?? new Date().toISOString(), status: 'ready',
          metadata: { source: 'retail_reception_action', provider_delivery_required: true },
        })).select().single();
        if (error) throw new Error(error.message);
        result = { ...result, communication_id: communication.id };
      }

      await admin.from('retail_reception_actions').update({ status: 'executed', executed_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq('id', action.id).eq('user_id', context.userId);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reception action execution failed.';
      await admin.from('retail_reception_actions').update({ status: 'failed', last_error: message.slice(0, 2000), updated_at: new Date().toISOString() })
        .eq('id', action.id).eq('user_id', context.userId);
      throw new Error(message);
    }
  });

export const saveRetailCustomerCommunication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => communicationSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_customer_communications').insert(clean({
      ...data, user_id: context.userId, status: data.status ?? 'ready', scheduled_for: data.scheduled_for ?? new Date().toISOString(),
      metadata: data.metadata ?? { source: 'manual', provider_delivery_required: true },
    })).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const cancelRetailCustomerCommunication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_customer_communications').update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', data.id).eq('user_id', context.userId).select().single();
    if (error) throw new Error(error.message);
    return out;
  });
