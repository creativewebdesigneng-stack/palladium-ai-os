/** A persisted connection is usable only after Nango has issued a real ID. */
export function nangoConnectionReady(
  row: { status?: string | null; config?: { connection_id?: unknown } | null } | null | undefined,
): boolean {
  return row?.status === 'connected' &&
    typeof row.config?.connection_id === 'string' &&
    row.config.connection_id.trim().length > 0;
}
