/** Render persisted structured results without JavaScript object coercion. */
export function workforceOutputText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? '';
}
