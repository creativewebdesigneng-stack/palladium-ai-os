import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const jsonObject = z.record(z.string(), z.unknown());

const profileSchema = z.object({
  workspace_id: uuid,
  active: z.boolean().optional(),
  greeting: optionalText(2000),
  business_hours: jsonObject.optional(),
  knowledge: jsonObject.optional(),
  policies: jsonObject.optional(),
  escalation_name: optionalText(180),
  escalation_phone: optionalText(80),
  default_channel: z.enum(['manual','sms','email','voice','whatsapp']).optional(),
  allow_ai_proposals: z.boolean().optional(),
  notes: optionalText(8000),
});

const actionSchema = z.object({
  workspace_id: uuid,
  call_id: uuid.nullish(),
  appointment_id: uuid.nullish(),
  order_id: uuid.nullish(),
  action_type: z.enum(['create_booking','reschedule_booking','cancel_booking','callback','prepare_customer_message']),
  summary: z.string().trim().min(1).max(2000),
  payload: jsonObject.optional(),
  idempotency_key: z.string().trim().min(1).max(240).nullish(),
});

const communicationSchema = z.object({
  workspace_id: uuid,
  appointment_id: uuid.nullish(),
  call_id: uuid.nullish(),
  order_id: uuid.nullish(),
  channel: z.enum(['manual','sms','email','voice','whatsapp']),
  purpose: z.enum(['booking_confirmation','callback','order_update','general']).optional(),
  recipient: z.string().trim().min(1).max(320),
  subject: optionalText(500),
  body: z.string().trim().min(1).max(4000),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
});

const rpcResultSchema = z.object({
  ok: z.boolean(),
  action_id: uuid.optional(),
  communication_id: uuid.optional(),
  status: z.string().optional(),
  error: z.string().optional(),
  result: jsonObject.optional(),
}).passthrough();

function clean<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === '' ? null : value]));
}

function parseRpcResult(value: unknown, fallback: string) {
  const parsed = rpcResultSchema.parse(value);
  if (!parsed.ok) throw new Error(parsed.error || fallback);
  return parsed;
}

export const getRetailReceptionistGovernance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_receptionist_profiles').select('*').eq('workspace_id', wid).maybeSingle(),
      sb.from('retail_receptionist_actions').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(300),
      sb.from('retail_customer_communications').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(500),
      sb.from('retail_appointments').select('id,customer_name,customer_phone,customer_email,starts_at,status').eq('workspace_id', wid).order('starts_at', { ascending: false }).limit(500),
      sb.from('retail_call_inbox').select('id,customer_name,phone,reason,summary,status,needs_follow_up,received_at').eq('workspace_id', wid).order('received_at', { ascending: false }).limit(300),
      sb.from('retail_orders').select('id,order_number,customer_name,customer_phone,customer_email,status,fulfilment_status,placed_at').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(300),
      sb.from('retail_locations').select('id,name,active').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_catalog_items').select('id,name,item_type,active').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_staff').select('id,name,role,active').eq('workspace_id', wid).eq('active', true).order('name'),
    ]);
    const error = queries.find((query: any) => query.error)?.error;
    if (error) throw new Error(error.message);
    const [profileQ, actionsQ, communicationsQ, appointmentsQ, callsQ, ordersQ, locationsQ, catalogQ, staffQ] = queries;
    const actions = actionsQ.data ?? [];
    const communications = communicationsQ.data ?? [];
    return {
      profile: profileQ.data ?? null,
      actions,
      communications,
      appointments: appointmentsQ.data ?? [],
      calls: callsQ.data ?? [],
      orders: ordersQ.data ?? [],
      locations: locationsQ.data ?? [],
      catalog: catalogQ.data ?? [],
      staff: staffQ.data ?? [],
      dashboard: {
        proposedActions: actions.filter((item: any) => item.status === 'proposed').length,
        approvedActions: actions.filter((item: any) => item.status === 'approved').length,
        failedActions: actions.filter((item: any) => item.status === 'failed').length,
        providerRequired: communications.filter((item: any) => item.status === 'provider_required').length,
        manualRequired: communications.filter((item: any) => item.status === 'manual_required').length,
      },
    };
  });

export const saveRetailReceptionistProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => profileSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = clean({
      ...data,
      user_id: context.userId,
      approval_required: true,
      business_hours: data.business_hours ?? {},
      knowledge: data.knowledge ?? {},
      policies: data.policies ?? {},
      updated_at: new Date().toISOString(),
    });
    const { data: out, error } = await sb.from('retail_receptionist_profiles')
      .upsert(row, { onConflict: 'workspace_id' }).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const createRetailReceptionistAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => actionSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_receptionist_actions').insert(clean({
      ...data,
      user_id: context.userId,
      requested_by: 'manual',
      status: 'proposed',
      payload: data.payload ?? {},
      idempotency_key: data.idempotency_key ?? null,
    })).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const reviewRetailReceptionistAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid, decision: z.enum(['approved','rejected']) }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_review_receptionist_action', {
      p_action_id: data.id,
      p_decision: data.decision,
    });
    if (error) throw new Error(error.message);
    return parseRpcResult(out, 'Could not review receptionist action.');
  });

export const executeRetailReceptionistAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_execute_receptionist_action', { p_action_id: data.id });
    if (error) throw new Error(error.message);
    return parseRpcResult(out, 'Receptionist action execution failed.');
  });

export const prepareRetailCustomerCommunication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => communicationSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const status = data.channel === 'manual' ? 'manual_required' : 'provider_required';
    const { data: out, error } = await sb.from('retail_customer_communications').insert(clean({
      ...data,
      user_id: context.userId,
      purpose: data.purpose ?? 'general',
      scheduled_for: data.scheduled_for ?? new Date().toISOString(),
      status,
      metadata: { source: 'manual', provider_delivery_required: data.channel !== 'manual' },
    })).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const cancelRetailCustomerCommunication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_cancel_customer_communication', { p_communication_id: data.id });
    if (error) throw new Error(error.message);
    return parseRpcResult(out, 'Could not cancel customer communication.');
  });

export const markRetailCustomerCommunicationHandled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_mark_customer_communication_handled', { p_communication_id: data.id });
    if (error) throw new Error(error.message);
    return parseRpcResult(out, 'Could not record manual communication handling.');
  });
