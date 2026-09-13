function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateRiskAmount(accountSize: number, riskPercent: number): number {
  const account = finiteNonNegative(accountSize);
  const risk = finiteNonNegative(riskPercent);
  return account * (risk / 100);
}

export function calculateUnitRisk(entryPrice: number, stopPrice: number): number {
  const entry = finitePositive(entryPrice);
  const stop = finitePositive(stopPrice);
  if (!entry || !stop) return 0;
  return Math.abs(entry - stop);
}

export function calculatePositionSize(
  accountSize: number,
  riskPercent: number,
  entryPrice: number,
  stopPrice: number,
): number {
  const riskAmount = calculateRiskAmount(accountSize, riskPercent);
  const unitRisk = calculateUnitRisk(entryPrice, stopPrice);
  return unitRisk > 0 ? riskAmount / unitRisk : 0;
}

export function calculateRiskReward(entryPrice: number, stopPrice: number, targetPrice: number): number {
  const entry = finitePositive(entryPrice);
  const target = finitePositive(targetPrice);
  const unitRisk = calculateUnitRisk(entryPrice, stopPrice);
  if (!entry || !target || unitRisk <= 0) return 0;
  return Math.abs(target - entry) / unitRisk;
}

export function calculateSimulationPnl(
  side: 'long' | 'short',
  quantity: number,
  entryPrice: number,
  exitPrice: number | null | undefined,
): number | null {
  const qty = finitePositive(quantity);
  const entry = finitePositive(entryPrice);
  const exit = exitPrice == null ? 0 : finitePositive(exitPrice);
  if (!qty || !entry || !exit) return null;
  const delta = side === 'short' ? entry - exit : exit - entry;
  return delta * qty;
}

export function calculateDrawdown(equityCurve: number[]): number {
  let peak = 0;
  let maxDrawdown = 0;

  for (const raw of equityCurve) {
    const value = finiteNonNegative(raw);
    if (value <= 0) continue;
    peak = Math.max(peak, value);
    if (peak <= 0) continue;
    maxDrawdown = Math.max(maxDrawdown, ((peak - value) / peak) * 100);
  }

  return maxDrawdown;
}

export function calculateMaximumLoss(quantity: number, entryPrice: number, stopPrice: number): number {
  const qty = finitePositive(quantity);
  const unitRisk = calculateUnitRisk(entryPrice, stopPrice);
  return qty && unitRisk ? qty * unitRisk : 0;
}

export function calculatePercentageReturn(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number | null | undefined,
): number | null {
  const entry = finitePositive(entryPrice);
  const exit = exitPrice == null ? 0 : finitePositive(exitPrice);
  if (!entry || !exit) return null;
  const delta = side === 'short' ? entry - exit : exit - entry;
  return (delta / entry) * 100;
}

export function calculatePositionExposure(quantity: number, price: number): number {
  const qty = finitePositive(quantity);
  const px = finitePositive(price);
  return qty && px ? qty * px : 0;
}

export function calculateExposurePercent(exposure: number, portfolioValue: number): number {
  const gross = finiteNonNegative(exposure);
  const portfolio = finitePositive(portfolioValue);
  return portfolio ? (gross / portfolio) * 100 : 0;
}

export type ManualPortfolioHolding = {
  symbol?: string | null;
  asset_type?: string | null;
  manual_value?: number | string | null;
  currency?: string | null;
};

export type ManualPortfolioExposureSummary = {
  currency: string;
  total: number;
  valuedCount: number;
  unvaluedCount: number;
  largestSymbol: string | null;
  largestValue: number;
  largestPercent: number;
  assetExposure: Array<{ assetType: string; value: number; percent: number }>;
};

export function summarizeManualPortfolioExposure(
  holdings: ManualPortfolioHolding[],
): ManualPortfolioExposureSummary[] {
  const groups = new Map<string, {
    total: number;
    valuedCount: number;
    unvaluedCount: number;
    largestSymbol: string | null;
    largestValue: number;
    assets: Map<string, number>;
  }>();

  for (const holding of holdings) {
    const currency = (holding.currency || 'UNKNOWN').toUpperCase();
    const current = groups.get(currency) ?? {
      total: 0,
      valuedCount: 0,
      unvaluedCount: 0,
      largestSymbol: null,
      largestValue: 0,
      assets: new Map<string, number>(),
    };
    const raw = Number(holding.manual_value);
    const hasValue = holding.manual_value != null && Number.isFinite(raw) && raw >= 0;
    if (!hasValue) {
      current.unvaluedCount += 1;
      groups.set(currency, current);
      continue;
    }

    const value = finiteNonNegative(raw);
    current.total += value;
    current.valuedCount += 1;
    if (value > current.largestValue) {
      current.largestValue = value;
      current.largestSymbol = holding.symbol || null;
    }
    const assetType = holding.asset_type || 'other';
    current.assets.set(assetType, (current.assets.get(assetType) ?? 0) + value);
    groups.set(currency, current);
  }

  return [...groups.entries()]
    .map(([currency, group]) => ({
      currency,
      total: group.total,
      valuedCount: group.valuedCount,
      unvaluedCount: group.unvaluedCount,
      largestSymbol: group.largestSymbol,
      largestValue: group.largestValue,
      largestPercent: calculateExposurePercent(group.largestValue, group.total),
      assetExposure: [...group.assets.entries()]
        .map(([assetType, value]) => ({
          assetType,
          value,
          percent: calculateExposurePercent(value, group.total),
        }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
