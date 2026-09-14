import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).optional();
const money = z.coerce.number().min(0).max(1_000_000_000).optional();

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

const registerSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, location_id: uuid.nullish(),
  name: z.string().trim().min(1).max(140), status: z.enum(['active','paused','retired']).optional(),
  external_provider: text(120), external_register_id: text(240), metadata: z.record(z.string(), z.unknown()).optional(),
});

const cashSessionSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, register_id: uuid,
  opened_by_staff_id: uuid.nullish(), closed_by_staff_id: uuid.nullish(),
  opened_at: z.string().datetime({ offset: true }).optional(), closed_at: z.string().datetime({ offset: true }).nullish(),
  opening_float: money, expected_cash: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  counted_cash: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  cash_variance: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  status: z.enum(['open','closed','investigate']).optional(), notes: text(5000),
});

const stocktakeSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, location_id: uuid.nullish(), name: z.string().trim().min(1).max(180),
  status: z.enum(['draft','counting','review','completed','cancelled']).optional(),
  started_at: z.string().datetime({ offset: true }).nullish(), completed_at: z.string().datetime({ offset: true }).nullish(), notes: text(5000),
});

const stocktakeLineSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, stocktake_id: uuid, item_id: uuid,
  expected_quantity: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  counted_quantity: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  variance: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).nullish(),
  counted_at: z.string().datetime({ offset: true }).nullish(), notes: text(2000),
});

const giftCardSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, code: z.string().trim().min(1).max(160),
  customer_name: text(180), customer_email: text(240), original_value: money, balance: money,
  currency: z.string().trim().min(3).max(8).optional(), status: z.enum(['active','redeemed','expired','void']).optional(),
  issued_at: z.string().datetime({ offset: true }).optional(), expires_at: z.string().datetime({ offset: true }).nullish(), notes: text(5000),
});

const shiftSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, staff_id: uuid, location_id: uuid.nullish(),
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }), role: text(160),
  status: z.enum(['scheduled','confirmed','completed','cancelled','absence']).optional(), break_minutes: z.coerce.number().int().min(0).max(1440).optional(), notes: text(5000),
}).refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), 'Shift end must be after start');

const timeEntrySchema = z.object({
  id: uuid.optional(), workspace_id: uuid, staff_id: uuid, shift_id: uuid.nullish(), location_id: uuid.nullish(),
  clock_in_at: z.string().datetime({ offset: true }), clock_out_at: z.string().datetime({ offset: true }).nullish(),
  break_minutes: z.coerce.number().int().min(0).max(1440).optional(), status: z.enum(['open','closed','adjusted','void']).optional(), notes: text(5000),
});

const reminderSchema = z.object({
  id: uuid.optional(), workspace_id: uuid, appointment_id: uuid,
  channel: z.enum(['sms','email','voice','whatsapp','in_app']).optional(), scheduled_for: z.string().datetime({ offset: true }),
  status: z.enum(['scheduled','sent','cancelled','failed','skipped']).optional(), template_key: text(160), provider_message_id: text(240), last_error: text(2000),
  sent_at: z.string().datetime({ offset: true }).nullish(), metadata: z.record(z.string(), z.unknown()).optional(),
});

export const getRetailStoreOperations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_registers').select('*').eq('workspace_id', wid).order('name'),
      sb.from('retail_cash_sessions').select('*').eq('workspace_id', wid).order('opened_at', { ascending: false }).limit(200),
      sb.from('retail_stocktakes').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(200),
      sb.from('retail_stocktake_lines').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(2000),
      sb.from('retail_gift_cards').select('*').eq('workspace_id', wid).order('issued_at', { ascending: false }).limit(500),
      sb.from('retail_staff_shifts').select('*').eq('workspace_id', wid).order('starts_at', { ascending: true }).limit(500),
      sb.from('retail_time_entries').select('*').eq('workspace_id', wid).order('clock_in_at', { ascending: false }).limit(500),
      sb.from('retail_booking_reminders').select('*').eq('workspace_id', wid).order('scheduled_for', { ascending: true }).limit(500),
      sb.from('retail_locations').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_staff').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_catalog_items').select('*').eq('workspace_id', wid).eq('active', true).order('name'),
      sb.from('retail_appointments').select('*').eq('workspace_id', wid).order('starts_at', { ascending: true }).limit(500),
    ]);
    const error = queries.find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const [registers, cashSessions, stocktakes, stocktakeLines, giftCards, shifts, timeEntries, reminders, locations, staff, catalog, appointments] = queries.map((q: any) => q.data ?? []);
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    const openCashSessions = cashSessions.filter((x: any) => x.status === 'open');
    const cashInvestigations = cashSessions.filter((x: any) => x.status === 'investigate');
    const activeStocktakes = stocktakes.filter((x: any) => ['draft','counting','review'].includes(x.status));
    const openTimeEntries = timeEntries.filter((x: any) => x.status === 'open');
    const upcomingShifts = shifts.filter((x: any) => { const t = new Date(x.starts_at).getTime(); return t >= now && t <= week && !['cancelled','absence'].includes(x.status); });
    const reminderQueue = reminders.filter((x: any) => x.status === 'scheduled' && new Date(x.scheduled_for).getTime() <= week);
    const giftCreditOutstanding = giftCards.filter((x: any) => x.status === 'active').reduce((sum: number, x: any) => sum + Number(x.balance ?? 0), 0);
    return {
      registers, cashSessions, stocktakes, stocktakeLines, giftCards, shifts, timeEntries, reminders, locations, staff, catalog, appointments,
      dashboard: {
        openCashSessions: openCashSessions.length,
        cashInvestigations: cashInvestigations.length,
        activeStocktakes: activeStocktakes.length,
        openTimeEntries: openTimeEntries.length,
        upcomingShifts: upcomingShifts.length,
        reminderQueue: reminderQueue.length,
        giftCreditOutstanding,
      },
    };
  });

export const saveRetailRegister = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => registerSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_registers', context.userId, data));
export const saveRetailCashSession = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => cashSessionSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_cash_sessions', context.userId, data));
export const saveRetailStocktake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => stocktakeSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_stocktakes', context.userId, data));
export const saveRetailStocktakeLine = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => stocktakeLineSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_stocktake_lines', context.userId, data));
export const saveRetailGiftCard = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => giftCardSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_gift_cards', context.userId, data));
export const saveRetailStaffShift = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => shiftSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_staff_shifts', context.userId, data));
export const saveRetailTimeEntry = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => timeEntrySchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_time_entries', context.userId, data));
export const saveRetailBookingReminder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => reminderSchema.parse(v)).handler(async ({ data, context }) => saveOwned(context.supabase as unknown as Sb, 'retail_booking_reminders', context.userId, data));
