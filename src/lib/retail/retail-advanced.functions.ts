import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const money = z.coerce.number().min(0).max(1_000_000_000).optional();

const returnSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, order_id: uuid.nullish(),
  return_number: z.string().trim().min(1).max(120), customer_name: optionalText(180),
  status: z.enum(['requested','approved','received','refunded','rejected','cancelled']).optional(),
  reason: optionalText(3000), items: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
  refund_amount: money, refund_method: z.enum(['original_payment','store_credit','cash','other']).nullish(),
  restock: z.boolean().optional(), requested_at: z.string().datetime({ offset: true }).optional(),
  received_at: z.string().datetime({ offset: true }).nullish(), refunded_at: z.string().datetime({ offset: true }).nullish(),
  notes: optionalText(8000),
});

const promotionSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, name: z.string().trim().min(1).max(180), code: optionalText(120),
  promotion_type: z.enum(['percentage','fixed_amount','buy_x_get_y','free_shipping','custom']).optional(),
  value: z.coerce.number().min(0).max(1_000_000_000).optional(), minimum_spend: money,
  channel: z.enum(['all','store','online','service','marketplace','social']).optional(),
  applies_to: z.record(z.string(), z.unknown()).optional(), starts_at: z.string().datetime({ offset: true }).nullish(), ends_at: z.string().datetime({ offset: true }).nullish(),
  usage_limit: z.coerce.number().int().min(0).max(1_000_000_000).nullish(), active: z.boolean().optional(), notes: optionalText(8000),
});

const loyaltyMemberSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, customer_name: z.string().trim().min(1).max(180),
  email: optionalText(240), phone: optionalText(80), tier: z.string().trim().min(1).max(80).optional(),
  last_activity_at: z.string().datetime({ offset: true }).nullish(), notes: optionalText(5000),
});

const transferSchema = z.object({
  workspace_id: uuid, transfer_number: z.string().trim().min(1).max(120), from_location_id: uuid, to_location_id: uuid,
  status: z.enum(['draft','approved','in_transit']).optional(), initiated_at: z.string().datetime({ offset: true }).optional(), notes: optionalText(5000),
  items: z.array(z.object({ item_id: uuid, quantity: z.coerce.number().positive().max(1_000_000_000), notes: optionalText(1000) })).min(1).max(200),
}).refine((v) => v.from_location_id !== v.to_location_id, 'Transfer locations must be different');

function clean<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === '' ? null : v]));
}

async function saveOwned(sb: Sb, table: string, userId: string, data: Record<string, unknown>) {
  const { id, ...values } = data;
  const row = clean({ ...values, updated_at: new Date().toISOString() });
  if (id) {
    const { data: out, error } = await sb.from(table).update(row).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw new Error(error.message);
    return out;
  }
  const { data: out, error } = await sb.from(table).insert({ ...row, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return out;
}

function riskRank(risk: string) {
  return risk === 'critical' ? 4 : risk === 'high' ? 3 : risk === 'medium' ? 2 : 1;
}

function buildDemandSignals({ catalog, inventory, movements, suppliers }: any) {
  const stock = new Map<string, number>();
  for (const level of inventory) {
    stock.set(level.item_id, (stock.get(level.item_id) ?? 0) + Number(level.on_hand ?? 0) - Number(level.reserved ?? 0));
  }

  const sold90 = new Map<string, number>();
  for (const movement of movements) {
    if (movement.movement_type !== 'sale') continue;
    sold90.set(movement.item_id, (sold90.get(movement.item_id) ?? 0) + Math.abs(Number(movement.quantity ?? 0)));
  }

  const suppliersById = new Map(suppliers.map((s: any) => [s.id, s]));
  return catalog
    .filter((item: any) => item.active && item.track_inventory && item.item_type !== 'service')
    .map((item: any) => {
      const available = stock.get(item.id) ?? 0;
      const units90 = sold90.get(item.id) ?? 0;
      const avgDailyDemand = units90 / 90;
      const supplier: any = item.supplier_id ? suppliersById.get(item.supplier_id) : null;
      const leadTimeDays = Number(supplier?.lead_time_days ?? 0);
      const reorderPoint = Number(item.reorder_point ?? 0);
      const configuredReorder = Number(item.reorder_quantity ?? 0);
      const daysOfCover = avgDailyDemand > 0 ? Math.max(0, available) / avgDailyDemand : null;
      const demandDuringLead = avgDailyDemand * Math.max(leadTimeDays, 1);
      const targetStock = Math.max(reorderPoint + demandDuringLead, reorderPoint * 2);
      const recommendedQuantity = Math.max(configuredReorder, Math.ceil(Math.max(0, targetStock - available)));
      let risk = 'stable';
      if (available <= 0 && avgDailyDemand > 0) risk = 'critical';
      else if (daysOfCover !== null && daysOfCover <= Math.max(leadTimeDays, 1)) risk = 'high';
      else if (available <= reorderPoint) risk = 'medium';
      const reason = risk === 'critical'
        ? 'Demand exists but available stock is depleted.'
        : risk === 'high'
          ? `Estimated stock cover (${daysOfCover?.toFixed(1)} days) is at or below supplier lead time (${leadTimeDays} days).`
          : risk === 'medium'
            ? `Available stock is at or below the configured reorder point (${reorderPoint}).`
            : 'Stock cover is currently above the configured reorder threshold.';
      return {
        item_id: item.id, name: item.name, sku: item.sku, supplier_id: item.supplier_id, supplier_name: supplier?.name ?? null,
        available_quantity: available, units_sold_90d: units90, avg_daily_demand: avgDailyDemand,
        forecast_30d: avgDailyDemand * 30, days_of_cover: daysOfCover, lead_time_days: leadTimeDays,
        reorder_point: reorderPoint, recommended_quantity: recommendedQuantity, risk, reason,
      };
    })
    .sort((a: any, b: any) => riskRank(b.risk) - riskRank(a.risk) || (a.days_of_cover ?? 1e9) - (b.days_of_cover ?? 1e9));
}

export const getRetailAdvancedOperations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const queries = await Promise.all([
      sb.from('retail_returns').select('*').eq('workspace_id', wid).order('requested_at', { ascending: false }).limit(300),
      sb.from('retail_promotions').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(300),
      sb.from('retail_loyalty_members').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(500),
      sb.from('retail_loyalty_events').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(500),
      sb.from('retail_reorder_proposals').select('*').eq('workspace_id', wid).order('generated_at', { ascending: false }).limit(500),
      sb.from('retail_stock_transfers').select('*').eq('workspace_id', wid).order('initiated_at', { ascending: false }).limit(300),
      sb.from('retail_stock_transfer_items').select('*').eq('workspace_id', wid).order('created_at', { ascending: true }).limit(1000),
      sb.from('retail_catalog_items').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_inventory_levels').select('*').eq('workspace_id', wid),
      sb.from('retail_inventory_movements').select('*').eq('workspace_id', wid).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(5000),
      sb.from('retail_suppliers').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_locations').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_orders').select('*').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(500),
    ]);
    const error = queries.find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const [returns, promotions, loyaltyMembers, loyaltyEvents, reorderProposals, transfers, transferItems, catalog, inventory, movements, suppliers, locations, orders] = queries.map((q: any) => q.data ?? []);
    const demandSignals = buildDemandSignals({ catalog, inventory, movements, suppliers });
    const now = Date.now();
    const activePromotions = promotions.filter((p: any) => p.active && (!p.starts_at || new Date(p.starts_at).getTime() <= now) && (!p.ends_at || new Date(p.ends_at).getTime() >= now));
    const openReturns = returns.filter((r: any) => !['refunded','rejected','cancelled'].includes(r.status));
    const openTransfers = transfers.filter((t: any) => !['completed','cancelled'].includes(t.status));
    const openReorders = reorderProposals.filter((p: any) => ['suggested','approved'].includes(p.status));
    return {
      returns, promotions, loyaltyMembers, loyaltyEvents, reorderProposals, transfers, transferItems,
      catalog, inventory, suppliers, locations, orders, demandSignals,
      dashboard: {
        openReturns: openReturns.length,
        activePromotions: activePromotions.length,
        loyaltyMembers: loyaltyMembers.length,
        loyaltyPointsOutstanding: loyaltyMembers.reduce((sum: number, m: any) => sum + Number(m.points_balance ?? 0), 0),
        openTransfers: openTransfers.length,
        openReorders: openReorders.length,
        criticalStockRisks: demandSignals.filter((s: any) => s.risk === 'critical').length,
        highStockRisks: demandSignals.filter((s: any) => s.risk === 'high').length,
      },
    };
  });

export const saveRetailReturn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => returnSchema.parse(value))
  .handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_returns', context.userId, data));

export const saveRetailPromotion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => promotionSchema.parse(value))
  .handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_promotions', context.userId, data));

export const saveRetailLoyaltyMember = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => loyaltyMemberSchema.parse(value))
  .handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_loyalty_members', context.userId, data));

export const adjustRetailLoyalty = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    member_id: uuid, points: z.coerce.number().int().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0, 'Points cannot be zero'),
    event_type: z.enum(['earn','redeem','adjust','expire','refund']), order_id: uuid.nullish(), amount: money, note: optionalText(2000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_adjust_loyalty', {
      p_member_id: data.member_id, p_points: data.points, p_event_type: data.event_type,
      p_order_id: data.order_id ?? null, p_amount: data.amount ?? 0, p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return out;
  });

export const saveRetailStockTransfer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => transferSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { items, ...transfer } = data;
    const { data: saved, error } = await sb.from('retail_stock_transfers').insert({ ...clean(transfer), user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    const rows = items.map((item) => ({ ...clean(item), user_id: context.userId, workspace_id: data.workspace_id, transfer_id: saved.id }));
    const { error: itemError } = await sb.from('retail_stock_transfer_items').insert(rows);
    if (itemError) {
      await sb.from('retail_stock_transfers').delete().eq('id', saved.id).eq('user_id', context.userId);
      throw new Error(itemError.message);
    }
    return saved;
  });

export const completeRetailStockTransfer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ transfer_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_complete_stock_transfer', { p_transfer_id: data.transfer_id });
    if (error) throw new Error(error.message);
    return out;
  });

export const updateRetailReorderProposal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: uuid, status: z.enum(['suggested','approved','ordered','dismissed']), purchase_order_id: uuid.nullish() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.from('retail_reorder_proposals')
      .update({ status: data.status, purchase_order_id: data.purchase_order_id ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', data.id).eq('user_id', context.userId).select().single();
    if (error) throw new Error(error.message);
    return out;
  });

export const generateRetailReorderProposals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [catalogQ, inventoryQ, movementsQ, suppliersQ, existingQ] = await Promise.all([
      sb.from('retail_catalog_items').select('*').eq('workspace_id', wid).eq('active', true),
      sb.from('retail_inventory_levels').select('*').eq('workspace_id', wid),
      sb.from('retail_inventory_movements').select('*').eq('workspace_id', wid).gte('occurred_at', since).limit(5000),
      sb.from('retail_suppliers').select('*').eq('workspace_id', wid),
      sb.from('retail_reorder_proposals').select('*').eq('workspace_id', wid).is('location_id', null),
    ]);
    const error = [catalogQ, inventoryQ, movementsQ, suppliersQ, existingQ].find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const signals = buildDemandSignals({ catalog: catalogQ.data ?? [], inventory: inventoryQ.data ?? [], movements: movementsQ.data ?? [], suppliers: suppliersQ.data ?? [] });
    const actionable = signals.filter((s: any) => s.risk !== 'stable' && s.recommended_quantity > 0);
    const existing = new Map((existingQ.data ?? []).map((p: any) => [p.item_id, p]));
    let created = 0; let updated = 0;
    for (const signal of actionable) {
      const row = {
        user_id: context.userId, workspace_id: wid, item_id: signal.item_id, supplier_id: signal.supplier_id ?? null, location_id: null,
        recommended_quantity: signal.recommended_quantity, available_quantity: signal.available_quantity, reorder_point: signal.reorder_point,
        avg_daily_demand: signal.avg_daily_demand, days_of_cover: signal.days_of_cover, reason: signal.reason,
        status: 'suggested', generated_at: new Date().toISOString(), reviewed_at: null,
        metadata: { risk: signal.risk, units_sold_90d: signal.units_sold_90d, forecast_30d: signal.forecast_30d, lead_time_days: signal.lead_time_days },
        updated_at: new Date().toISOString(),
      };
      const current: any = existing.get(signal.item_id);
      if (current) {
        const { error: updateError } = await sb.from('retail_reorder_proposals').update(row).eq('id', current.id).eq('user_id', context.userId);
        if (updateError) throw new Error(updateError.message);
        updated += 1;
      } else {
        const { error: insertError } = await sb.from('retail_reorder_proposals').insert(row);
        if (insertError) throw new Error(insertError.message);
        created += 1;
      }
    }
    return { created, updated, actionable: actionable.length, signals: signals.length };
  });
