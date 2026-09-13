import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { normaliseTradingSymbol, type TradingMarketKind } from "./market-data";
import { loadTradingMarketSeriesFromProvider } from "./market-data.server";

const KINDS = new Set<TradingMarketKind>(["equity", "fx", "crypto"]);

export const getTradingMarketSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind?: string; symbol?: string }) => {
    const kind = String(input?.kind ?? "equity") as TradingMarketKind;
    if (!KINDS.has(kind)) throw new Error("Unsupported market type.");
    const rawSymbol = String(input?.symbol ?? "").trim();
    const normalised = normaliseTradingSymbol(kind, rawSymbol);
    return { kind, symbol: normalised.display };
  })
  .handler(async ({ data, context }) => {
    try {
      const result = await loadTradingMarketSeriesFromProvider(data.kind, data.symbol);
      if (!result.configured) return result;

      await writeAudit({
        userId: context.userId,
        action: "trading.market_series.read",
        targetType: "market_data",
        status: "success",
        metadata: {
          provider: result.series.provider,
          kind: data.kind,
          symbol: result.series.symbol,
          observations: result.series.candles.length,
          asOf: result.series.asOf,
        },
      });
      return result;
    } catch (error) {
      await writeAudit({
        userId: context.userId,
        action: "trading.market_series.read",
        targetType: "market_data",
        status: "failed",
        metadata: {
          provider: "alpha-vantage",
          kind: data.kind,
          symbol: data.symbol,
          error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
        },
      });
      throw new Error(error instanceof Error ? error.message : "Market data is temporarily unavailable.");
    }
  });
