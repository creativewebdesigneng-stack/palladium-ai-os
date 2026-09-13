export type TradingExchange = {
  code: string;
  name: string;
  region: string;
  city: string;
  timezone: string;
  instruments: string[];
  referenceSession: string;
  officialUrl: string;
};

export type AssetClass = {
  name: string;
  description: string;
  examples: string;
  riskNote: string;
};

export const TRADING_EXCHANGES: TradingExchange[] = [
  { code: "NYSE", name: "New York Stock Exchange", region: "North America", city: "New York", timezone: "America/New_York", instruments: ["Equities", "ETFs"], referenceSession: "09:30–16:00 ET", officialUrl: "https://www.nyse.com/" },
  { code: "NASDAQ", name: "Nasdaq Stock Market", region: "North America", city: "New York", timezone: "America/New_York", instruments: ["Equities", "ETFs"], referenceSession: "09:30–16:00 ET", officialUrl: "https://www.nasdaq.com/" },
  { code: "LSE", name: "London Stock Exchange", region: "Europe", city: "London", timezone: "Europe/London", instruments: ["Equities", "ETFs", "Bonds"], referenceSession: "08:00–16:30 UK", officialUrl: "https://www.londonstockexchange.com/" },
  { code: "EURONEXT", name: "Euronext", region: "Europe", city: "Pan-European", timezone: "Europe/Paris", instruments: ["Equities", "ETFs", "Bonds", "Derivatives"], referenceSession: "Venue-specific", officialUrl: "https://www.euronext.com/" },
  { code: "XETRA", name: "Deutsche Börse / Xetra", region: "Europe", city: "Frankfurt", timezone: "Europe/Berlin", instruments: ["Equities", "ETFs"], referenceSession: "09:00–17:30 CET/CEST", officialUrl: "https://www.deutsche-boerse.com/" },
  { code: "SIX", name: "SIX Swiss Exchange", region: "Europe", city: "Zurich", timezone: "Europe/Zurich", instruments: ["Equities", "ETFs", "Bonds"], referenceSession: "Venue-specific", officialUrl: "https://www.six-group.com/" },
  { code: "JPX", name: "Japan Exchange Group", region: "Asia Pacific", city: "Tokyo", timezone: "Asia/Tokyo", instruments: ["Equities", "ETFs", "Derivatives"], referenceSession: "Venue-specific", officialUrl: "https://www.jpx.co.jp/english/" },
  { code: "HKEX", name: "Hong Kong Exchanges and Clearing", region: "Asia Pacific", city: "Hong Kong", timezone: "Asia/Hong_Kong", instruments: ["Equities", "ETFs", "Derivatives"], referenceSession: "Venue-specific", officialUrl: "https://www.hkex.com.hk/" },
  { code: "SSE", name: "Shanghai Stock Exchange", region: "Asia Pacific", city: "Shanghai", timezone: "Asia/Shanghai", instruments: ["Equities", "ETFs", "Bonds"], referenceSession: "Venue-specific", officialUrl: "https://english.sse.com.cn/" },
  { code: "SZSE", name: "Shenzhen Stock Exchange", region: "Asia Pacific", city: "Shenzhen", timezone: "Asia/Shanghai", instruments: ["Equities", "ETFs", "Bonds"], referenceSession: "Venue-specific", officialUrl: "https://www.szse.cn/English/" },
  { code: "ASX", name: "Australian Securities Exchange", region: "Asia Pacific", city: "Sydney", timezone: "Australia/Sydney", instruments: ["Equities", "ETFs", "Derivatives"], referenceSession: "Venue-specific", officialUrl: "https://www.asx.com.au/" },
  { code: "TSX", name: "Toronto Stock Exchange", region: "North America", city: "Toronto", timezone: "America/Toronto", instruments: ["Equities", "ETFs"], referenceSession: "09:30–16:00 ET", officialUrl: "https://www.tsx.com/" },
  { code: "NSE", name: "National Stock Exchange of India", region: "Asia Pacific", city: "Mumbai", timezone: "Asia/Kolkata", instruments: ["Equities", "ETFs", "Derivatives"], referenceSession: "Venue-specific", officialUrl: "https://www.nseindia.com/" },
  { code: "BSE", name: "BSE India", region: "Asia Pacific", city: "Mumbai", timezone: "Asia/Kolkata", instruments: ["Equities", "ETFs", "Bonds"], referenceSession: "Venue-specific", officialUrl: "https://www.bseindia.com/" },
  { code: "CME", name: "CME Group", region: "Global Derivatives", city: "Chicago", timezone: "America/Chicago", instruments: ["Futures", "Options"], referenceSession: "Contract-specific", officialUrl: "https://www.cmegroup.com/" },
  { code: "ICE", name: "Intercontinental Exchange", region: "Global Derivatives", city: "Global", timezone: "Multiple", instruments: ["Futures", "Options", "Energy", "Rates"], referenceSession: "Contract-specific", officialUrl: "https://www.ice.com/" },
  { code: "CBOE", name: "Cboe Global Markets", region: "Global Derivatives", city: "Chicago", timezone: "America/Chicago", instruments: ["Options", "Equities", "Volatility"], referenceSession: "Venue-specific", officialUrl: "https://www.cboe.com/" },
];

export const ASSET_CLASSES: AssetClass[] = [
  { name: "Equities", description: "Shares in listed companies across global venues.", examples: "Common stock, ADRs, REITs", riskNote: "Company, sector, liquidity and market risk." },
  { name: "ETFs & Funds", description: "Pooled exposures to indices, sectors, themes and assets.", examples: "Index, sector, bond and commodity ETFs", riskNote: "Tracking, liquidity, concentration and structure risk." },
  { name: "Options", description: "Rights to buy or sell an underlying at defined terms.", examples: "Calls, puts, spreads", riskNote: "Complex payoff, volatility, time-decay and assignment risk." },
  { name: "Futures", description: "Standardised contracts for future settlement.", examples: "Equity index, rates, energy, metals", riskNote: "Leverage and gap risk can exceed posted margin." },
  { name: "FX", description: "Trading one currency relative to another.", examples: "GBP/USD, EUR/USD, USD/JPY", riskNote: "Leverage, macro, intervention and rollover risk." },
  { name: "Digital Assets", description: "Cryptoassets and tokenised market instruments.", examples: "BTC, ETH and venue-listed products", riskNote: "Extreme volatility, custody, venue and regulatory risk." },
  { name: "Commodities", description: "Energy, metals and agricultural exposures.", examples: "Oil, gas, gold, copper, grains", riskNote: "Supply, geopolitics, weather and futures-curve risk." },
  { name: "Fixed Income", description: "Sovereign and corporate debt instruments.", examples: "Gilts, Treasuries, corporates", riskNote: "Duration, credit, inflation and liquidity risk." },
  { name: "Indices", description: "Benchmarks representing baskets of securities.", examples: "FTSE 100, S&P 500, Nikkei 225", riskNote: "Broad-market and concentration risk." },
  { name: "Rates & Volatility", description: "Interest-rate and implied-volatility exposures.", examples: "Yield curves, swaps references, VIX-linked products", riskNote: "Convexity, leverage, model and term-structure risk." },
];

export function calculatePositionSize(accountSize: number, riskPercent: number, entry: number, stop: number) {
  if (![accountSize, riskPercent, entry, stop].every(Number.isFinite) || accountSize <= 0 || riskPercent <= 0 || entry <= 0 || stop <= 0) return null;
  const riskPerUnit = Math.abs(entry - stop);
  if (riskPerUnit === 0) return null;
  const riskCapital = accountSize * (riskPercent / 100);
  const units = riskCapital / riskPerUnit;
  return { riskCapital, riskPerUnit, units, notional: units * entry };
}

export function calculateRiskReward(entry: number, stop: number, target: number) {
  if (![entry, stop, target].every(Number.isFinite) || entry <= 0 || stop <= 0 || target <= 0) return null;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return null;
  return { risk, reward, ratio: reward / risk };
}

export function calculateDrawdown(peak: number, current: number) {
  if (![peak, current].every(Number.isFinite) || peak <= 0 || current < 0 || current > peak) return null;
  return ((peak - current) / peak) * 100;
}
