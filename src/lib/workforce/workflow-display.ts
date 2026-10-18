/** Preserve structured workflow evidence without JavaScript object coercion. */
export function workflowDisplayText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? '';
}

/** The usage API returns totals plus metadata; metadata is never a metric. */
export function workforceUsageTotals(summary: unknown): Record<string, number> {
  if (!summary || typeof summary !== 'object') return {};
  const totals = (summary as { totals?: unknown }).totals;
  if (!totals || typeof totals !== 'object' || Array.isArray(totals)) return {};
  return Object.fromEntries(Object.entries(totals).filter(([, value]) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0)) as Record<string, number>;
}
