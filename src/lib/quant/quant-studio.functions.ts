import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const strategyInput = z.object({
  name: z.string().trim().min(1).max(120),
  assetClass: z.string().trim().min(1).max(60).default('multi-asset'),
  universe: z.array(z.string().trim().min(1).max(40)).max(200).default([]),
  baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  riskTarget: z.number().positive().max(1),
});

const returnPoint = z.object({
  date: z.string().date(),
  returnPct: z.number().finite().min(-100).max(1000),
});

function computeBacktest(points: Array<{ date: string; returnPct: number }>, startingCapital: number) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let equity = startingCapital;
  let peak = startingCapital;
  let maxDrawdown = 0;
  const daily = sorted.map((point) => point.returnPct / 100);
  const curve = sorted.map((point) => {
    equity *= 1 + point.returnPct / 100;
    peak = Math.max(peak, equity);
    const drawdown = peak === 0 ? 0 : (equity - peak) / peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    return { date: point.date, equity: Number(equity.toFixed(2)), drawdown: Number((drawdown * 100).toFixed(4)) };
  });
  const mean = daily.reduce((sum, value) => sum + value, 0) / daily.length;
  const variance = daily.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, daily.length - 1);
  const volatility = Math.sqrt(variance) * Math.sqrt(252);
  const annualizedReturn = (1 + mean) ** 252 - 1;
  const sharpe = volatility > 0 ? annualizedReturn / volatility : 0;
  const totalReturn = equity / startingCapital - 1;
  return {
    curve,
    metrics: {
      observations: daily.length,
      endingCapital: Number(equity.toFixed(2)),
      totalReturnPct: Number((totalReturn * 100).toFixed(4)),
      annualizedReturnPct: Number((annualizedReturn * 100).toFixed(4)),
      annualizedVolatilityPct: Number((volatility * 100).toFixed(4)),
      sharpe: Number(sharpe.toFixed(4)),
      maxDrawdownPct: Number((maxDrawdown * 100).toFixed(4)),
    },
  };
}

export const getQuantStudioOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const strategies = await sb.from('quant_strategies').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(50);
    if (strategies.error) throw new Error(strategies.error.message);
    const runs = await sb.from('quant_backtest_runs').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(50);
    if (runs.error) throw new Error(runs.error.message);
    return { strategies: strategies.data ?? [], runs: runs.data ?? [] };
  });

export const saveQuantStrategy = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => strategyInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const inserted = await sb.from('quant_strategies').insert({
      user_id: context.userId,
      name: data.name,
      asset_class: data.assetClass,
      universe: data.universe,
      base_currency: data.baseCurrency,
      risk_target: data.riskTarget,
      config: { methodology: 'native-palladium', execution: 'research-only' },
    }).select('*').maybeSingle();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Strategy could not be saved.');
    await writeAudit({ userId: context.userId, action: 'quant.strategy_created', targetType: 'quant_strategy', targetId: inserted.data.id, metadata: { assetClass: data.assetClass, universeSize: data.universe.length } });
    return inserted.data;
  });

export const runQuantBacktest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    strategyId: z.string().uuid(),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    startingCapital: z.number().positive().max(1_000_000_000),
    returns: z.array(returnPoint).min(2).max(5000),
  }).refine((value) => value.periodEnd > value.periodStart, { message: 'Backtest end date must be after the start date.' }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const owned = await sb.from('quant_strategies').select('id,risk_target').eq('id', data.strategyId).eq('user_id', context.userId).maybeSingle();
    if (owned.error) throw new Error(owned.error.message);
    if (!owned.data) throw new Error('Strategy not found.');
    const points = data.returns.filter((point) => point.date >= data.periodStart && point.date <= data.periodEnd);
    if (points.length < 2) throw new Error('At least two real historical return observations are required inside the selected period.');
    const output = computeBacktest(points, data.startingCapital);
    const inserted = await sb.from('quant_backtest_runs').insert({
      user_id: context.userId,
      strategy_id: data.strategyId,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      starting_capital: data.startingCapital,
      status: 'completed',
      metrics: { ...output.metrics, riskTarget: Number(owned.data.risk_target) },
      equity_curve: output.curve,
    }).select('*').maybeSingle();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Backtest could not be saved.');
    await writeAudit({ userId: context.userId, action: 'quant.backtest_completed', targetType: 'quant_backtest_run', targetId: inserted.data.id, metadata: { observations: points.length, strategyId: data.strategyId } });
    return inserted.data;
  });
