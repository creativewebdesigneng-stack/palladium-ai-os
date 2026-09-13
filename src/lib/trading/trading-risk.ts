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
