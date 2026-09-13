import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import {
  buildAlphaVantageUrl,
  normaliseTradingSymbol,
  parseAlphaVantageSeries,
  type TradingMarketKind,
} from "./market-data";

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
    const apiKey = String(process.env["ALPHA_VANTAGE_API_KEY"] ?? "").trim();
    if (!apiKey) {
      return {
        configured: false as const,
        provider: "alpha-vantage" as const,
        message: "Connect ALPHA_VANTAGE_API_KEY on the server to load provider market data.",
      };
    }

    try {
      const request = buildAlphaVantageUrl(data.kind, data.symbol, apiKey);
      const response = await fetch(request.url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Market provider returned HTTP ${response.status}.`);
      const payload = await response.json();
      const series = parseAlphaVantageSeries(payload, data.kind, request.displaySymbol);
      await writeAudit({
        userId: context.userId,
        action: "trading.market_series.read",
        targetType: "market_data",
        status: "success",
        metadata: {
          provider: series.provider,
          kind: data.kind,
          symbol: request.displaySymbol,
          observations: series.candles.length,
          asOf: series.asOf,
        },
      });
      return { configured: true as const, series };
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
