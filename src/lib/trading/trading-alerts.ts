export type TradingAlertOperator = 'above' | 'below';

export function marketThresholdTriggered(
  operator: TradingAlertOperator,
  observedValue: number,
  threshold: number,
): boolean {
  if (!Number.isFinite(observedValue) || !Number.isFinite(threshold)) return false;
  return operator === 'above' ? observedValue > threshold : observedValue < threshold;
}

export function marketAlertCooldownElapsed(
  lastTriggeredAt: string | null | undefined,
  cooldownMinutes: number,
  nowMs = Date.now(),
): boolean {
  if (!lastTriggeredAt) return true;
  const lastMs = new Date(lastTriggeredAt).getTime();
  if (!Number.isFinite(lastMs)) return true;
  const safeMinutes = Number.isFinite(cooldownMinutes) && cooldownMinutes > 0 ? cooldownMinutes : 1_440;
  return nowMs - lastMs >= safeMinutes * 60_000;
}
