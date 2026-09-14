import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const getRetailExecutionState = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ workspace_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const wid = data.workspace_id;
    const queries = await Promise.all([
      sb.from('retail_stocktakes').select('*').eq('workspace_id', wid).order('created_at', { ascending: false }).limit(200),
      sb.from('retail_stocktake_lines').select('*').eq('workspace_id', wid).order('updated_at', { ascending: false }).limit(2000),
      sb.from('retail_gift_cards').select('*').eq('workspace_id', wid).order('issued_at', { ascending: false }).limit(500),
      sb.from('retail_gift_card_events').select('*').eq('workspace_id', wid).order('occurred_at', { ascending: false }).limit(1000),
      sb.from('retail_catalog_items').select('id,name,sku').eq('workspace_id', wid).order('name'),
    ]);
    const error = queries.find((q: any) => q.error)?.error;
    if (error) throw new Error(error.message);
    const [stocktakes, stocktakeLines, giftCards, giftCardEvents, catalog] = queries.map((q: any) => q.data ?? []);
    return { stocktakes, stocktakeLines, giftCards, giftCardEvents, catalog };
  });

export const completeRetailStocktake = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ stocktake_id: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_complete_stocktake', { p_stocktake_id: data.stocktake_id });
    if (error) throw new Error(error.message);
    return out;
  });

export const issueRetailGiftCard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    workspace_id: uuid,
    code: z.string().trim().min(1).max(160),
    value: z.coerce.number().positive().max(1_000_000_000),
    currency: z.string().trim().min(3).max(8).default('GBP'),
    customer_name: optionalText(180),
    customer_email: optionalText(240),
    expires_at: z.string().datetime({ offset: true }).nullish(),
    note: optionalText(5000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_issue_gift_card', {
      p_workspace_id: data.workspace_id,
      p_code: data.code,
      p_value: data.value,
      p_currency: data.currency,
      p_customer_name: data.customer_name ?? null,
      p_customer_email: data.customer_email ?? null,
      p_expires_at: data.expires_at ?? null,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return out;
  });

export const adjustRetailGiftCard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    gift_card_id: uuid,
    amount: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0, 'Amount cannot be zero'),
    event_type: z.enum(['redeem','refund','adjust','void','expire']),
    order_id: uuid.nullish(),
    return_id: uuid.nullish(),
    reference: optionalText(240),
    note: optionalText(5000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: out, error } = await sb.rpc('retail_adjust_gift_card', {
      p_gift_card_id: data.gift_card_id,
      p_amount: data.amount,
      p_event_type: data.event_type,
      p_order_id: data.order_id ?? null,
      p_return_id: data.return_id ?? null,
      p_reference: data.reference ?? null,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return out;
  });
