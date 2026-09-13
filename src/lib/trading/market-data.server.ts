import {
  buildAlphaVantageUrl,
  parseAlphaVantageSeries,
  type MarketSeriesResult,
  type TradingMarketKind,
} from './market-data';

export type TradingMarketSeriesLoadResult =
  | {
      configured: false;
      provider: 'alpha-vantage';
      message: string;
    }
  | {
      configured: true;
      series: MarketSeriesResult;
    };

export async function loadTradingMarketSeriesFromProvider(
  kind: TradingMarketKind,
  symbol: string,
): Promise<TradingMarketSeriesLoadResult> {
  const apiKey = String(process.env['ALPHA_VANTAGE_API_KEY'] ?? '').trim();
  if (!apiKey) {
    return {
      configured: false,
      provider: 'alpha-vantage',
      message: 'Connect ALPHA_VANTAGE_API_KEY on the server to load provider market data.',
    };
  }

  const request = buildAlphaVantageUrl(kind, symbol, apiKey);
  const response = await fetch(request.url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Market provider returned HTTP ${response.status}.`);

  const payload = await response.json();
  return {
    configured: true,
    series: parseAlphaVantageSeries(payload, kind, request.displaySymbol),
  };
}
