import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const nullableUuid = uuid.nullish();
const dateTime = z.string().datetime({ offset: true });

const bookingPayload = z.object({
  customer_name: z.string().trim().min(1).max(180).optional(),
  customer_phone: optionalText(80), customer_email: z.string().trim().email().max(240).optional().or(z.literal('')),
  starts_at: dateTime, ends_at: dateTime,
  location_id: nullableUuid, service_item_id: nullableUuid, staff_id: nullableUuid,
  note: optionalText(2000),
}).refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), { message: 'End time must be after start time.', path: ['ends_at'] });

const reschedulePayload = z.object({
  starts_at: dateTime, ends_at: dateTime,
  location_id: nullableUuid, service_item_id: nullableUuid, staff_id: nullableUuid,
  note: optionalText(2000),
}).refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), { message: 'End time must be after start time.', path: ['ends_at'] });

const proposalSchema = z.discriminatedUnion('action_type', [
  z.object({ action_type: z.literal('create_appointment'), workspace_id: uuid, call_id: uuid, target_appointment_id: z.null().optional(), payload: bookingPayload, idempotency_key: optionalText(300) }),
  z.object({ action_type: z.literal('reschedule_appointment'), workspace_id: uuid, call_id: uuid, target_appointment_id: uuid, payload: reschedulePayload, idempotency_key: optionalText(300) }),
  z.object({ action_type: z.literal('cancel_appointment'), workspace_id: uuid, call_id: uuid, target_appointment_id: uuid, payload: z.object({ note: optionalText(2000) }), idempotency_key: optionalText(300) }),
  z.object({ action_type: z.literal('mark_follow_up'), workspace_id: uuid, call_id: uuid, target_appointment_id: z.null().optional(), payload: z.object({ note: optionalText(2000) }), idempotency_key: optionalText(300) }),
  z.object({ action_type: z.literal('close_call'), workspace_id: uuid, call_id: uuid, target_appointment_id: z.null().optional(), payload: z.object({ note: optionalText(2000) }), idempotency_key: optionalText(300) }),
]);

export const getRetailReceptionistControl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const results = await Promise.all([
      sb.from('retail_call_inbox').select('*').eq('workspace_id', wid).order('received_at', { ascending: false }).limit(400),
      sb.from('retail_call_actions').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(500),
      sb.from('retail_appointments').select('*').eq('workspace_id', wid).order('starts_at', { ascending: false }).limit(500),
      sb.from('retail_locations').select('id,name,active').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_catalog_items').select('id,name,item_type,active,service_duration_minutes').eq('workspace_id', wid).eq('active', true).eq('item_type', 'service').order('name'),
      sb.from('retail_staff').select('id,name,role,active,services').eq('workspace_id', wid).eq('active', true).order('name'),
    ]);
    const error = results.find((r: any) => r.error)?.error;
    if (error) throw new Error(error.message);
    const [calls, actions, appointments, locations, services, staff] = results.map((r: any) => r.data ?? []);
    return {
      calls, actions, appointments, locations, services, staff,
      dashboard: {
        unresolvedCalls: calls.filter((c: any) => c.status !== 'closed').length,
        followUps: calls.filter((c: any) => c.needs_follow_up || c.status === 'follow_up').length,
        proposedActions: actions.filter((a: any) => a.status === 'proposed').length,
        approvedActions: actions.filter((a: any) => a.status === 'approved').length,
        executedActions: actions.filter((a: any) => a.status === 'executed').length,
        failedActions: actions.filter((a: any) => a.status === 'failed').length,
      },
    };
  });

export const proposeRetailCallAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => proposalSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: saved, error } = await sb.from('retail_call_actions').insert({
      user_id: context.userId,
      workspace_id: data.workspace_id,
      call_id: data.call_id,
      action_type: data.action_type,
      target_appointment_id: data.target_appointment_id ?? null,
      payload: data.payload,
      status: 'proposed',
      approval_required: true,
      idempotency_key: data.idempotency_key || null,
    }).select().single();
    if (error) {
      if (error.code === '23505' && data.idempotency_key) {
        const existing = await sb.from('retail_call_actions').select('*').eq('workspace_id', data.workspace_id).eq('idempotency_key', data.idempotency_key).maybeSingle();
        if (existing.error) throw new Error(existing.error.message);
        if (existing.data) return existing.data;
      }
      throw new Error(error.message);
    }
    return saved;
  });

const actionStatusSchema = z.object({ action_id: uuid });

export const approveRetailCallAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionStatusSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_set_call_action_status', { p_action_id: data.action_id, p_status: 'approved' });
    if (error) throw new Error(error.message);
    return out;
  });

export const dismissRetailCallAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionStatusSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_set_call_action_status', { p_action_id: data.action_id, p_status: 'dismissed' });
    if (error) throw new Error(error.message);
    return out;
  });

export const executeRetailCallAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionStatusSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_execute_call_action', { p_action_id: data.action_id });
    if (error) throw new Error(error.message);
    return out;
  });
