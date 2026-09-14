import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();

const paymentSchema = z.object({
  workspace_id: uuid,
  order_id: uuid.nullish(),
  cash_session_id: uuid.nullish(),
  register_id: uuid.nullish(),
  provider: z.string().trim().min(1).max(80).default('manual'),
  external_payment_id: z.string().trim().max(300).nullish(),
  event_type: z.enum(['sale','refund','chargeback','adjustment']),
  direction: z.enum(['inflow','outflow']),
  method: z.enum(['cash','card','gift_card','store_credit','bank_transfer','wallet','online','other']),
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().min(3).max(8).default('GBP'),
  status: z.enum(['pending','authorised','captured','failed','voided']).default('captured'),
  reference: optionalText(500),
  notes: optionalText(3000),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).superRefine((value, ctx) => {
  if (value.event_type === 'sale' && value.direction !== 'inflow') ctx.addIssue({ code: 'custom', message: 'Sales must be inflows.', path: ['direction'] });
  if (['refund','chargeback'].includes(value.event_type) && value.direction !== 'outflow') ctx.addIssue({ code: 'custom', message: 'Refunds and chargebacks must be outflows.', path: ['direction'] });
});

function financialStatus(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'PAID') return 'paid';
  if (status === 'AUTHORIZED' || status === 'AUTHORISED') return 'authorised';
  if (status === 'PARTIALLY_REFUNDED') return 'part_refunded';
  if (status === 'REFUNDED') return 'refunded';
  if (['EXPIRED','VOIDED','FAILED'].includes(status)) return 'failed';
  return 'unpaid';
}

function fulfilmentStatus(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'FULFILLED') return 'shipped';
  if (['PARTIALLY_FULFILLED','IN_PROGRESS','OPEN','PENDING_FULFILLMENT'].includes(status)) return 'picking';
  if (status === 'RESTOCKED') return 'returned';
  return 'unfulfilled';
}

function retailOrderStatus(paymentStatus: string) {
  if (paymentStatus === 'refunded') return 'refunded';
  if (paymentStatus === 'paid' || paymentStatus === 'authorised' || paymentStatus === 'part_refunded') return 'confirmed';
  return 'open';
}

function safeOrderNumber(name: unknown, externalId: unknown) {
  const base = String(name || 'ORDER').replace(/^#+/, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55) || 'ORDER';
  const tail = String(externalId || '').split('/').pop()?.replace(/[^A-Za-z0-9]/g, '').slice(-24) || crypto.randomUUID().replace(/-/g, '').slice(-12);
  return `SHOPIFY-${base}-${tail}`.slice(0, 120);
}

export const getRetailCommerceControl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_external_order_links').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(250),
      sb.from('retail_payment_events').select('*').eq('workspace_id', wid).order('occurred_at', { ascending: false }).limit(500),
      sb.from('retail_reconciliation_runs').select('*').eq('workspace_id', wid).order('reconciled_at', { ascending: false }).limit(250),
      sb.from('retail_orders').select('id,order_number,total,currency,payment_status,fulfilment_status,status,placed_at').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(500),
      sb.from('retail_cash_sessions').select('*').eq('workspace_id', wid).order('opened_at', { ascending: false }).limit(250),
      sb.from('retail_registers').select('id,name,location_id,status,external_provider,external_register_id').eq('workspace_id', wid).order('name'),
      sb.from('retail_staff').select('id,name,active').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('integrations').select('provider,status,account_label,last_error').eq('provider', 'shopify').maybeSingle(),
    ]);
    const firstError = queries.find((q: any) => q.error)?.error;
    if (firstError) throw new Error(firstError.message);
    const [links, payments, reconciliations, orders, sessions, registers, staff, shopifyResult] = queries.map((q: any) => q.data ?? (q === queries[7] ? null : []));
    const captured = payments.filter((p: any) => p.status === 'captured');
    const netCaptured = captured.reduce((sum: number, p: any) => sum + (p.direction === 'inflow' ? Number(p.amount || 0) : -Number(p.amount || 0)), 0);
    const cashCaptured = captured.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + (p.direction === 'inflow' ? Number(p.amount || 0) : -Number(p.amount || 0)), 0);
    return {
      links, payments, reconciliations, orders, sessions, registers, staff,
      shopify: shopifyResult ? { connected: shopifyResult.status === 'connected', ...shopifyResult } : { connected: false, provider: 'shopify', status: 'not_connected' },
      dashboard: {
        linkedOrders: links.length,
        capturedEvents: captured.length,
        netCaptured,
        cashCaptured,
        openCashSessions: sessions.filter((s: any) => s.status === 'open').length,
        reconciliationReviews: reconciliations.filter((r: any) => r.status === 'review').length,
      },
    };
  });

export const syncRetailShopifyOrders = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid, limit: z.coerce.number().int().min(1).max(50).default(50) }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: workspace, error: workspaceError } = await sb.from('retail_workspaces').select('id,currency').eq('id', data.workspace_id).eq('user_id', context.userId).maybeSingle();
    if (workspaceError) throw new Error(workspaceError.message);
    if (!workspace) throw new Error('Retail workspace not found.');

    const { executeNativeShopifyAction } = await import('@/lib/integrations/shopify.server');
    const execution = await executeNativeShopifyAction({ userId: context.userId, action: 'orders_list', actionInput: { limit: data.limit } });
    if (!execution.ok) throw new Error(execution.error || 'Shopify order sync failed.');
    const nodes = Array.isArray((execution.result as any)?.nodes) ? (execution.result as any).nodes : [];
    let created = 0;
    let updated = 0;

    for (const source of nodes) {
      const externalId = String(source?.id || '').trim();
      if (!externalId) continue;
      const paymentStatus = financialStatus(source?.displayFinancialStatus);
      const fulfilment = fulfilmentStatus(source?.displayFulfillmentStatus);
      const money = source?.currentTotalPriceSet?.shopMoney ?? {};
      const amount = Math.max(0, Number(money?.amount || 0));
      const currency = String(money?.currencyCode || workspace.currency || 'GBP').slice(0, 8);
      const lineItems = Array.isArray(source?.lineItems?.nodes) ? source.lineItems.nodes.slice(0, 1000).map((item: any) => ({
        name: String(item?.name || '').slice(0, 300),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        sku: item?.sku ? String(item.sku).slice(0, 160) : null,
      })) : [];

      const { data: existingLink, error: linkError } = await sb.from('retail_external_order_links')
        .select('id,retail_order_id')
        .eq('workspace_id', data.workspace_id).eq('provider', 'shopify').eq('external_order_id', externalId).maybeSingle();
      if (linkError) throw new Error(linkError.message);

      const orderPatch = {
        channel: 'online',
        status: retailOrderStatus(paymentStatus),
        payment_status: paymentStatus,
        fulfilment_status: fulfilment,
        line_items: lineItems,
        subtotal: amount,
        tax: 0,
        shipping: 0,
        total: amount,
        currency,
        placed_at: source?.createdAt || new Date().toISOString(),
        notes: 'Synchronized from connected Shopify order data. Shopify total is stored as the Retail total; tax/shipping decomposition is not inferred when not present in the bounded source payload.',
        updated_at: new Date().toISOString(),
      };

      let retailOrderId = existingLink?.retail_order_id as string | undefined;
      if (retailOrderId) {
        const { error } = await sb.from('retail_orders').update(orderPatch).eq('id', retailOrderId).eq('workspace_id', data.workspace_id).eq('user_id', context.userId);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const { data: saved, error } = await sb.from('retail_orders').insert({
          ...orderPatch,
          user_id: context.userId,
          workspace_id: data.workspace_id,
          order_number: safeOrderNumber(source?.name, externalId),
        }).select('id').single();
        if (error) throw new Error(error.message);
        retailOrderId = saved.id;
        created += 1;
      }

      const linkRow = {
        user_id: context.userId,
        workspace_id: data.workspace_id,
        retail_order_id: retailOrderId,
        provider: 'shopify',
        external_order_id: externalId,
        external_order_number: source?.name ? String(source.name).slice(0, 200) : null,
        external_updated_at: source?.createdAt || null,
        metadata: {
          financial_status: source?.displayFinancialStatus || null,
          fulfilment_status: source?.displayFulfillmentStatus || null,
          bounded_sync: true,
        },
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await sb.from('retail_external_order_links').upsert(linkRow, { onConflict: 'workspace_id,provider,external_order_id' });
      if (upsertError) throw new Error(upsertError.message);
    }

    return { ok: true, checked: nodes.length, created, updated };
  });

export const recordRetailPaymentEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => paymentSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: saved, error } = await sb.from('retail_payment_events').insert({
      ...data,
      order_id: data.order_id || null,
      cash_session_id: data.cash_session_id || null,
      register_id: data.register_id || null,
      external_payment_id: data.external_payment_id || null,
      reference: data.reference || null,
      notes: data.notes || null,
      metadata: data.metadata || {},
      occurred_at: data.occurred_at || new Date().toISOString(),
      user_id: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const reconcileRetailCashSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    cash_session_id: uuid,
    counted_cash: z.coerce.number().min(0).max(1_000_000_000),
    tolerance: z.coerce.number().min(0).max(1_000_000).default(0.01),
    closed_by_staff_id: uuid.nullish(),
    note: optionalText(2000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_reconcile_cash_session', {
      p_cash_session_id: data.cash_session_id,
      p_counted_cash: data.counted_cash,
      p_tolerance: data.tolerance,
      p_closed_by_staff_id: data.closed_by_staff_id || null,
      p_note: data.note || null,
    });
    if (error) throw new Error(error.message);
    return out;
  });
