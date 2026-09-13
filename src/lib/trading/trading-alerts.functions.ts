import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';
import { normaliseTradingSymbol, type TradingMarketKind } from './market-data';
import { loadTradingMarketSeriesFromProvider } from './market-data.server';
import { marketAlertCooldownElapsed, marketThresholdTriggered } from './trading-alerts';

type Sb = { from: (table: string) => any };

type TradingAlertEvaluationResult = {
  id: string;
  name: string;
  status: 'triggered' | 'clear' | 'unavailable';
  reason?: string;
  provider?: string;
  value?: number;
  threshold?: number;
  operator?: 'above' | 'below';
  symbol?: string;
  asOf?: string;
  freshness?: string;
  notified?: boolean;
};

type TradingAlertRow = {
  id: string;
  user_id: string;
  name: string;
  kind: TradingMarketKind;
  symbol: string;
  operator: 'above' | 'below';
  threshold: number | string;
  enabled: boolean;
  cooldown_minutes: number;
  last_evaluated_at: string | null;
  last_value: number | string | null;
  last_as_of: string | null;
  last_provider: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

const alertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(['equity', 'fx', 'crypto']),
  symbol: z.string().trim().min(1).max(32),
  operator: z.enum(['above', 'below']),
  threshold: z.coerce.number().positive().max(1e15),
  enabled: z.boolean().default(true),
  cooldown_minutes: z.coerce.number().int().min(60).max(10_080).default(1_440),
});

const idSchema = z.object({ id: z.string().uuid() });

function normaliseAlertSymbol(kind: TradingMarketKind, symbol: string) {
  return normaliseTradingSymbol(kind, symbol).display;
}

function providerKey(kind: TradingMarketKind, symbol: string) {
  return `${kind}:${symbol}`;
}

export const listTradingMarketAlerts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('trading_market_alerts')
      .select('id,name,kind,symbol,operator,threshold,enabled,cooldown_minutes,last_evaluated_at,last_value,last_as_of,last_provider,last_triggered_at,created_at,updated_at')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveTradingMarketAlert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => alertSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const now = new Date().toISOString();
    const row = {
      name: data.name,
      kind: data.kind,
      symbol: normaliseAlertSymbol(data.kind, data.symbol),
      operator: data.operator,
      threshold: data.threshold,
      enabled: data.enabled,
      cooldown_minutes: data.cooldown_minutes,
      updated_at: now,
    };

    if (data.id) {
      const { data: output, error } = await sb
        .from('trading_market_alerts')
        .update(row)
        .eq('id', data.id)
        .eq('user_id', context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return output;
    }

    const { data: output, error } = await sb
      .from('trading_market_alerts')
      .insert({ ...row, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return output;
  });

export const deleteTradingMarketAlert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from('trading_market_alerts')
      .delete()
      .eq('id', data.id)
      .eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const evaluateTradingMarketAlerts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('trading_market_alerts')
      .select('*')
      .eq('user_id', context.userId)
      .eq('enabled', true)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const alerts = (data ?? []) as TradingAlertRow[];
    const providerReads = new Map<string, Promise<Awaited<ReturnType<typeof loadTradingMarketSeriesFromProvider>>>>();
    const readSeries = (alert: TradingAlertRow) => {
      const key = providerKey(alert.kind, alert.symbol);
      let pending = providerReads.get(key);
      if (!pending) {
        pending = loadTradingMarketSeriesFromProvider(alert.kind, alert.symbol);
        providerReads.set(key, pending);
      }
      return pending;
    };

    const results: TradingAlertEvaluationResult[] = [];
    let triggeredCount = 0;
    let unavailableCount = 0;
    let notificationCount = 0;

    for (const alert of alerts) {
      const evaluatedAt = new Date().toISOString();
      try {
        const provider = await readSeries(alert);
        if (!provider.configured) {
          unavailableCount += 1;
          results.push({
            id: alert.id,
            name: alert.name,
            status: 'unavailable',
            reason: provider.message,
            provider: provider.provider,
          });
          await sb
            .from('trading_market_alerts')
            .update({ last_evaluated_at: evaluatedAt, last_provider: provider.provider, updated_at: evaluatedAt })
            .eq('id', alert.id)
            .eq('user_id', context.userId);
          continue;
        }

        const candle = provider.series.candles.at(-1);
        if (!candle || provider.series.asOf == null) throw new Error('Market provider returned no latest daily observation.');

        const value = Number(candle.close);
        const threshold = Number(alert.threshold);
        const triggered = marketThresholdTriggered(alert.operator, value, threshold);
        const cooldownElapsed = marketAlertCooldownElapsed(alert.last_triggered_at, Number(alert.cooldown_minutes || 1_440));
        let notified = false;
        let lastTriggeredAt = alert.last_triggered_at;

        if (triggered) {
          triggeredCount += 1;
          if (cooldownElapsed) {
            const { notifyWithOutcome } = await import('@/lib/notifications/notify.server');
            const outcome = await notifyWithOutcome({
              userId: context.userId,
              type: 'trading.market_observation_threshold',
              title: `Trading alert: ${alert.name}`,
              body: `${alert.symbol} provider daily close ${value.toLocaleString()} is ${alert.operator} ${threshold.toLocaleString()} (as of ${provider.series.asOf}).`,
              link: '/trading-hub',
              metadata: {
                trading_market_alert_id: alert.id,
                kind: alert.kind,
                symbol: alert.symbol,
                operator: alert.operator,
                threshold,
                observed_value: value,
                as_of: provider.series.asOf,
                provider: provider.series.provider,
                freshness: provider.series.freshness,
              },
            });
            if (outcome !== 'failed') {
              lastTriggeredAt = evaluatedAt;
              notified = outcome === 'emitted';
              if (notified) notificationCount += 1;
            }
          }
        }

        const update = {
          last_evaluated_at: evaluatedAt,
          last_value: value,
          last_as_of: provider.series.asOf,
          last_provider: provider.series.provider,
          last_triggered_at: lastTriggeredAt,
          updated_at: evaluatedAt,
        };
        const { error: updateError } = await sb
          .from('trading_market_alerts')
          .update(update)
          .eq('id', alert.id)
          .eq('user_id', context.userId);
        if (updateError) throw new Error(updateError.message);

        results.push({
          id: alert.id,
          name: alert.name,
          status: triggered ? 'triggered' : 'clear',
          value,
          threshold,
          operator: alert.operator,
          symbol: alert.symbol,
          asOf: provider.series.asOf,
          provider: provider.series.provider,
          freshness: provider.series.freshness,
          notified,
        });
      } catch (providerError) {
        unavailableCount += 1;
        const reason = providerError instanceof Error ? providerError.message.slice(0, 300) : 'Market data is temporarily unavailable.';
        results.push({ id: alert.id, name: alert.name, status: 'unavailable', reason });
        await sb
          .from('trading_market_alerts')
          .update({ last_evaluated_at: evaluatedAt, updated_at: evaluatedAt })
          .eq('id', alert.id)
          .eq('user_id', context.userId);
      }
    }

    await writeAudit({
      userId: context.userId,
      action: 'trading.market_alerts.evaluate',
      targetType: 'market_data',
      status: 'success',
      metadata: {
        alerts: alerts.length,
        unique_provider_reads: providerReads.size,
        triggered: triggeredCount,
        unavailable: unavailableCount,
        notifications_emitted: notificationCount,
      },
    });

    return {
      evaluated_at: new Date().toISOString(),
      provider_reads: providerReads.size,
      results,
    };
  });
