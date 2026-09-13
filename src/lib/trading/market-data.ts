import type { TradingCandle } from "./indicators";

export type TradingMarketKind = "equity" | "fx" | "crypto";

export type MarketSeriesResult = {
  provider: "alpha-vantage";
  sourceLabel: string;
  freshness: "historical" | "delayed" | "realtime";
  symbol: string;
  kind: TradingMarketKind;
  asOf: string | null;
  candles: TradingCandle[];
};

function safeToken(value: unknown, max = 20) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9.\-_/]/g, "").slice(0, max);
}

export function normaliseTradingSymbol(kind: TradingMarketKind, input: string) {
  const token = safeToken(input, 30);
  if (kind === "equity") {
    if (!token || !/^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(token)) throw new Error("Enter a valid market symbol.");
    return { display: token, symbol: token };
  }
  const parts = token.split(/[\/_-]/).filter(Boolean);
  if (parts.length !== 2 || parts.some((part) => !/^[A-Z0-9]{2,10}$/.test(part))) {
    throw new Error(kind === "fx" ? "Use an FX pair such as EUR/USD." : "Use a crypto pair such as BTC/USD.");
  }
  return { display: `${parts[0]}/${parts[1]}`, from: parts[0], to: parts[1] };
}

export function buildAlphaVantageUrl(kind: TradingMarketKind, input: string, apiKey: string) {
  const symbol = normaliseTradingSymbol(kind, input);
  const url = new URL("https://www.alphavantage.co/query");
  if (kind === "equity") {
    url.searchParams.set("function", "TIME_SERIES_DAILY");
    url.searchParams.set("symbol", symbol.symbol ?? "");
    url.searchParams.set("outputsize", "compact");
  } else if (kind === "fx") {
    url.searchParams.set("function", "FX_DAILY");
    url.searchParams.set("from_symbol", symbol.from ?? "");
    url.searchParams.set("to_symbol", symbol.to ?? "");
    url.searchParams.set("outputsize", "compact");
  } else {
    url.searchParams.set("function", "DIGITAL_CURRENCY_DAILY");
    url.searchParams.set("symbol", symbol.from ?? "");
    url.searchParams.set("market", symbol.to ?? "");
  }
  url.searchParams.set("apikey", apiKey);
  return { url, displaySymbol: symbol.display };
}

function numberFrom(row: Record<string, unknown>, exact: string, fallbackPrefix?: string) {
  const raw = row[exact] ?? (fallbackPrefix
    ? row[Object.keys(row).find((key) => key.toLowerCase().startsWith(fallbackPrefix.toLowerCase())) ?? ""]
    : undefined);
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function locateSeries(payload: Record<string, unknown>) {
  const key = Object.keys(payload).find((candidate) => candidate.toLowerCase().includes("time series"));
  const value = key ? payload[key] : null;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Record<string, unknown>>
    : null;
}

export function parseAlphaVantageSeries(
  payload: unknown,
  kind: TradingMarketKind,
  symbol: string,
): MarketSeriesResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Market provider returned an invalid response.");
  const record = payload as Record<string, unknown>;
  const providerMessage = record["Error Message"] ?? record["Information"] ?? record["Note"];
  if (typeof providerMessage === "string" && providerMessage.trim()) {
    throw new Error(`Market provider: ${providerMessage.trim().slice(0, 240)}`);
  }
  const series = locateSeries(record);
  if (!series) throw new Error("Market provider returned no daily price series for this symbol.");

  const candles: TradingCandle[] = Object.entries(series).flatMap(([time, row]) => {
    const open = numberFrom(row, "1. open", "1a. open");
    const high = numberFrom(row, "2. high", "2a. high");
    const low = numberFrom(row, "3. low", "3a. low");
    const close = numberFrom(row, "4. close", "4a. close");
    const volume = numberFrom(row, "5. volume", "5. volume");
    if (open === null || high === null || low === null || close === null) return [];
    return [{ time, open, high, low, close, volume }];
  });

  candles.sort((a, b) => a.time.localeCompare(b.time));
  if (!candles.length) throw new Error("Market provider returned no usable OHLC observations.");
  const compact = candles.slice(-100);
  return {
    provider: "alpha-vantage",
    sourceLabel: "Alpha Vantage daily market data",
    freshness: "historical",
    symbol,
    kind,
    asOf: compact.at(-1)?.time ?? null,
    candles: compact,
  };
}
