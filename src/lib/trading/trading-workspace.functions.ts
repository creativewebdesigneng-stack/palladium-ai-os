import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };

const assetTypes = ['stock', 'etf', 'fund', 'bond', 'fx', 'future', 'option', 'commodity', 'crypto', 'index', 'other'] as const;
const journalSides = ['long', 'short', 'neutral'] as const;
const tradeSides = ['long', 'short'] as const;
const statuses = ['planned', 'open', 'closed', 'cancelled'] as const;

const watchlistInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).optional(),
});

const watchlistItemInput = z.object({
  id: z.string().uuid().optional(),
  watchlist_id: z.string().uuid(),
  symbol: z.string().trim().min(1).max(32),
  name: z.string().trim().max(120).optional(),
  market: z.string().trim().max(80).optional(),
  asset_type: z.enum(assetTypes).optional(),
  thesis: z.string().trim().max(4000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  watch_level: z.coerce.number().positive().max(1e15).optional(),
  target_level: z.coerce.number().positive().max(1e15).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const journalInput = z.object({
  id: z.string().uuid().optional(),
  symbol: z.string().trim().min(1).max(32).optional(),
  side: z.enum(journalSides).default('neutral'),
  status: z.enum(statuses).default('planned'),
  simulation_id: z.string().uuid().optional(),
  setup: z.string().trim().max(4000).optional(),
  catalyst: z.string().trim().max(4000).optional(),
  thesis: z.string().trim().max(8000).optional(),
  entry_reasoning: z.string().trim().max(8000).optional(),
  risk_plan: z.string().trim().max(8000).optional(),
  strategy: z.string().trim().max(120).optional(),
  plan: z.string().trim().max(8000).optional(),
  discipline_notes: z.string().trim().max(8000).optional(),
  mistakes: z.string().trim().max(8000).optional(),
  outcome: z.string().trim().max(8000).optional(),
  lessons: z.string().trim().max(8000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const simulationInput = z.object({
  id: z.string().uuid().optional(),
  symbol: z.string().trim().min(1).max(32),
  side: z.enum(tradeSides),
  quantity: z.coerce.number().positive().max(1e12),
  asset_type: z.enum(assetTypes).optional(),
  market: z.string().trim().max(80).optional(),
  entry_price: z.coerce.number().positive().max(1e15),
  stop_price: z.coerce.number().positive().max(1e15).optional(),
  target_price: z.coerce.number().positive().max(1e15).optional(),
  exit_price: z.coerce.number().positive().max(1e15).optional(),
  currency: z.string().trim().length(3).default('GBP'),
  status: z.enum(statuses).default('planned'),
  strategy: z.string().trim().max(120).optional(),
  thesis: z.string().trim().max(8000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  notes: z.string().trim().max(8000).optional(),
}).superRefine((value, ctx) => {
  if (value.status === 'closed' && value.exit_price == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exit_price'], message: 'Closed simulations require an exit price.' });
  }
});

const idInput = z.object({ id: z.string().uuid() });

export const listTradingWorkspace = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [watchlistsResult, itemsResult, journalResult, simulationsResult] = await Promise.all([
      sb.from('trading_watchlists').select('id,name,description,created_at,updated_at').order('updated_at', { ascending: false }).limit(100),
      sb.from('trading_watchlist_items').select('id,watchlist_id,symbol,name,market,asset_type,thesis,tags,watch_level,target_level,notes,created_at,updated_at').order('updated_at', { ascending: false }).limit(500),
      sb.from('trading_journal_entries').select('id,simulation_id,symbol,side,status,setup,catalyst,thesis,entry_reasoning,risk_plan,strategy,plan,discipline_notes,mistakes,outcome,lessons,tags,created_at,updated_at').order('updated_at', { ascending: false }).limit(200),
      sb.from('trading_simulations').select('id,symbol,side,quantity,asset_type,market,entry_price,stop_price,target_price,exit_price,currency,status,strategy,thesis,tags,notes,opened_at,closed_at,created_at,updated_at').order('updated_at', { ascending: false }).limit(200),
    ]);

    const failure = [watchlistsResult, itemsResult, journalResult, simulationsResult].find((result) => result.error);
    if (failure?.error) throw new Error(failure.error.message);

    return {
      watchlists: watchlistsResult.data ?? [],
      watchlistItems: itemsResult.data ?? [],
      journal: journalResult.data ?? [],
      simulations: simulationsResult.data ?? [],
    };
  });

export const saveTradingWatchlist = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => watchlistInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      name: data.name,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: output, error } = await sb.from('trading_watchlists').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return output;
    }

    const { data: output, error } = await sb.from('trading_watchlists').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return output;
  });

export const deleteTradingWatchlist = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('trading_watchlists').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveTradingWatchlistItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => watchlistItemInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      watchlist_id: data.watchlist_id,
      symbol: data.symbol.toUpperCase(),
      name: data.name || null,
      market: data.market || null,
      asset_type: data.asset_type || null,
      thesis: data.thesis || null,
      tags: data.tags,
      watch_level: data.watch_level ?? null,
      target_level: data.target_level ?? null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: output, error } = await sb.from('trading_watchlist_items').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return output;
    }

    const { data: output, error } = await sb.from('trading_watchlist_items').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return output;
  });

export const deleteTradingWatchlistItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('trading_watchlist_items').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveTradingJournalEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => journalInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      symbol: data.symbol?.toUpperCase() || null,
      side: data.side,
      status: data.status,
      simulation_id: data.simulation_id || null,
      setup: data.setup || null,
      catalyst: data.catalyst || null,
      thesis: data.thesis || null,
      entry_reasoning: data.entry_reasoning || null,
      risk_plan: data.risk_plan || null,
      strategy: data.strategy || null,
      plan: data.plan || null,
      discipline_notes: data.discipline_notes || null,
      mistakes: data.mistakes || null,
      outcome: data.outcome || null,
      lessons: data.lessons || null,
      tags: data.tags,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: output, error } = await sb.from('trading_journal_entries').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return output;
    }

    const { data: output, error } = await sb.from('trading_journal_entries').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return output;
  });

export const deleteTradingJournalEntry = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('trading_journal_entries').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveTradingSimulation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => simulationInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const now = new Date().toISOString();
    const row = {
      symbol: data.symbol.toUpperCase(),
      side: data.side,
      quantity: data.quantity,
      asset_type: data.asset_type || null,
      market: data.market || null,
      entry_price: data.entry_price,
      stop_price: data.stop_price ?? null,
      target_price: data.target_price ?? null,
      exit_price: data.exit_price ?? null,
      currency: data.currency.toUpperCase(),
      status: data.status,
      strategy: data.strategy || null,
      thesis: data.thesis || null,
      tags: data.tags,
      notes: data.notes || null,
      opened_at: data.status === 'open' || data.status === 'closed' ? now : null,
      closed_at: data.status === 'closed' ? now : null,
      updated_at: now,
    };

    if (data.id) {
      const { data: output, error } = await sb.from('trading_simulations').update(row).eq('id', data.id).eq('user_id', context.userId).select().single();
      if (error) throw new Error(error.message);
      return output;
    }

    const { data: output, error } = await sb.from('trading_simulations').insert({ ...row, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return output;
  });

export const deleteTradingSimulation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from('trading_simulations').delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
