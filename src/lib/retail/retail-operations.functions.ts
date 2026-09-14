import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).optional();
const money = z.coerce.number().min(0).max(1_000_000_000).optional();

const workspaceSchema = z.object({
  id: uuid.optional(),
  business_name: z.string().trim().min(1).max(160),
  business_type: z.enum(['retail_store','barber','salon','beauty','convenience','boutique','service_shop','ecommerce','mixed','other']).default('retail_store'),
  currency: z.string().trim().min(3).max(8).default('GBP'),
  timezone: z.string().trim().min(1).max(120).default('Europe/London'),
  phone: text(80), email: text(240), notes: text(8000),
  address: z.record(z.string(), z.unknown()).optional(),
  ai_preferences: z.record(z.string(), z.unknown()).optional(),
});

const locationSchema = z.object({
  id: uuid.optional(), workspace_id: uuid,
  name: z.string().trim().min(1).max(140),
  kind: z.enum(['store','salon','barber','warehouse','office','online','other']).default('store'),
  phone: text(80), active: z.boolean().optional(), address: z.record(z.string(), z.unknown()).optional(),
});

const supplierSchema = z.object({
  id: uuid.optional(), workspace_id: uuid,
  name: z.string().trim().min(1).max(180), contact_name: text(160), email: text(240), phone: text(80), website: text(500), notes: text(8000),
  lead_time_days: z.coerce.number().int().min(0).max(3650).optional(), minimum_order_amount: money,
  currency: z.string().trim().min(3).max(8).optional(), status: z.enum(['active','paused','blocked','archived']).optional(),
});

const catalogSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, supplier_id: uuid.nullish(),
  name: z.string().trim().min(1).max(180), item_type: z.enum(['product','service','supply']).default('product'),
  sku: text(120), barcode: text(160), category: text(160), description: text(5000),
  cost_price: money, sale_price: money, currency: z.string().trim().min(3).max(8).optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(), track_inventory: z.boolean().optional(),
  reorder_point: z.coerce.number().min(0).max(1_000_000_000).optional(), reorder_quantity: z.coerce.number().min(0).max(1_000_000_000).optional(),
  service_duration_minutes: z.coerce.number().int().min(5).max(1440).nullish(), active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const purchaseOrderSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, supplier_id: uuid.nullish(), po_number: z.string().trim().min(1).max(120),
  status: z.enum(['draft','ordered','part_received','received','cancelled']).optional(),
  items: z.array(z.record(z.string(), z.unknown())).max(500).optional(), subtotal: money, tax: money, shipping: money, total: money,
  currency: z.string().trim().min(3).max(8).optional(), ordered_at: z.string().datetime({ offset: true }).nullish(), expected_at: z.string().datetime({ offset: true }).nullish(), received_at: z.string().datetime({ offset: true }).nullish(), notes: text(8000),
});

const staffSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, name: z.string().trim().min(1).max(160), role: text(160), phone: text(80), email: text(240), notes: text(5000),
  services: z.array(z.string().trim().max(160)).max(100).optional(), working_hours: z.record(z.string(), z.unknown()).optional(), active: z.boolean().optional(),
});

const appointmentSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, location_id: uuid.nullish(), service_item_id: uuid.nullish(), staff_id: uuid.nullish(),
  customer_name: z.string().trim().min(1).max(180), customer_phone: text(80), customer_email: text(240),
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }).nullish(),
  status: z.enum(['requested','booked','confirmed','checked_in','completed','cancelled','no_show']).optional(),
  source: z.enum(['manual','phone','web','walk_in','ai','integration']).optional(), notes: text(8000),
});

const orderSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, location_id: uuid.nullish(), order_number: z.string().trim().min(1).max(120),
  customer_name: text(180), customer_phone: text(80), customer_email: text(240),
  channel: z.enum(['store','online','phone','marketplace','social','other']).optional(), status: z.enum(['draft','open','confirmed','completed','cancelled','refunded']).optional(),
  payment_status: z.enum(['unpaid','authorised','paid','part_refunded','refunded','failed']).optional(), fulfilment_status: z.enum(['unfulfilled','picking','packed','shipped','ready_for_collection','collected','delivered','returned']).optional(),
  line_items: z.array(z.record(z.string(), z.unknown())).max(1000).optional(), subtotal: money, tax: money, shipping: money, total: money,
  currency: z.string().trim().min(3).max(8).optional(), shipping_address: z.record(z.string(), z.unknown()).optional(), carrier: text(160), tracking_number: text(240),
  placed_at: z.string().datetime({ offset: true }).optional(), fulfilled_at: z.string().datetime({ offset: true }).nullish(), notes: text(8000),
});

const callSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, direction: z.enum(['inbound','outbound']).optional(), customer_name: text(180), phone: text(80), reason: text(500), summary: text(8000), outcome: text(2000),
  status: z.enum(['new','handled','follow_up','closed']).optional(), needs_follow_up: z.boolean().optional(), appointment_id: uuid.nullish(),
  source: z.enum(['manual','voice_studio','phone_provider','ai','integration']).optional(), received_at: z.string().datetime({ offset: true }).optional(),
});

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

export const listRetailWorkspaces = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('retail_workspaces').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRetailOperations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_locations').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_suppliers').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_catalog_items').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_inventory_levels').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }),
      sb.from('retail_inventory_movements').select('*').eq('workspace_id', wid).order('occurred_at', { ascending: false }).limit(100),
      sb.from('retail_purchase_orders').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(200),
      sb.from('retail_staff').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_appointments').select('*').eq('workspace_id', wid).order('starts_at', { ascending: true }).limit(300),
      sb.from('retail_orders').select('*').eq('workspace_id', wid).order('placed_at', { ascending: false }).limit(300),
      sb.from('retail_call_inbox').select('*').eq('workspace_id', wid).order('received_at', { ascending: false }).limit(200),
    ]);
    const error = queries.find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const [locations, suppliers, catalog, inventory, movements, purchaseOrders, staff, appointments, orders, calls] = queries.map((q: any) => q.data ?? []);
    const stock = new Map<string, number>();
    for (const level of inventory) stock.set(level.item_id, (stock.get(level.item_id) ?? 0) + Number(level.on_hand ?? 0) - Number(level.reserved ?? 0));
    const lowStock = catalog.filter((item: any) => item.active && item.track_inventory && item.item_type !== 'service' && (stock.get(item.id) ?? 0) <= Number(item.reorder_point ?? 0));
    const inventoryValue = catalog.reduce((sum: number, item: any) => sum + Math.max(0, stock.get(item.id) ?? 0) * Number(item.cost_price ?? 0), 0);
    const now = Date.now();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const todaysAppointments = appointments.filter((a: any) => { const t = new Date(a.starts_at).getTime(); return t >= dayStart.getTime() && t < dayEnd.getTime() && !['cancelled','no_show'].includes(a.status); });
    const upcomingAppointments = appointments.filter((a: any) => new Date(a.starts_at).getTime() >= now && !['cancelled','completed','no_show'].includes(a.status)).slice(0, 12);
    const openOrders = orders.filter((o: any) => !['completed','cancelled','refunded'].includes(o.status));
    const fulfilmentQueue = orders.filter((o: any) => !['delivered','collected','returned'].includes(o.fulfilment_status) && !['cancelled','refunded'].includes(o.status));
    const openPurchaseOrders = purchaseOrders.filter((p: any) => !['received','cancelled'].includes(p.status));
    const followUps = calls.filter((c: any) => c.needs_follow_up || ['new','follow_up'].includes(c.status));
    const todayRevenue = orders.filter((o: any) => new Date(o.placed_at).getTime() >= dayStart.getTime() && new Date(o.placed_at).getTime() < dayEnd.getTime() && ['paid','authorised'].includes(o.payment_status) && !['cancelled','refunded'].includes(o.status)).reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
    return {
      locations, suppliers, catalog, inventory, movements, purchaseOrders, staff, appointments, orders, calls,
      dashboard: { lowStock, inventoryValue, todaysAppointments, upcomingAppointments, openOrders, fulfilmentQueue, openPurchaseOrders, followUps, todayRevenue },
    };
  });

export const saveRetailWorkspace = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => workspaceSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_workspaces', context.userId, data));
export const saveRetailLocation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => locationSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_locations', context.userId, data));
export const saveRetailSupplier = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => supplierSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_suppliers', context.userId, data));
export const saveRetailCatalogItem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => catalogSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_catalog_items', context.userId, data));
export const saveRetailPurchaseOrder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => purchaseOrderSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_purchase_orders', context.userId, data));
export const saveRetailStaff = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => staffSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_staff', context.userId, data));
export const saveRetailAppointment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => appointmentSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_appointments', context.userId, data));
export const saveRetailOrder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => orderSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_orders', context.userId, data));
export const saveRetailCall = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => callSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_call_inbox', context.userId, data));

export const adjustRetailInventory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    workspace_id: uuid, item_id: uuid, location_id: uuid.nullish(), quantity: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0, 'Quantity cannot be zero'),
    movement_type: z.enum(['stock_in','sale','return','adjustment','waste','transfer_in','transfer_out','reservation','release']), note: text(2000), reference_type: text(120), reference_id: text(240),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_adjust_inventory', {
      p_workspace_id: data.workspace_id, p_item_id: data.item_id, p_location_id: data.location_id ?? null,
      p_quantity: data.quantity, p_movement_type: data.movement_type, p_note: data.note ?? null,
      p_reference_type: data.reference_type ?? null, p_reference_id: data.reference_id ?? null,
    });
    if (error) throw new Error(error.message);
    return out;
  });
