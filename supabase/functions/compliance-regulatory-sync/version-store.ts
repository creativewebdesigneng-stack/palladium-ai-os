type VersionRow = { regulation_id: string; content_hash: string; [key: string]: unknown };
type Db = { from: (table: string) => any };

/** Content-addressed snapshots are immutable, including when a source reverts. */
export async function persistRegulationVersion(db: Db, row: VersionRow): Promise<{ id: string; created: boolean }> {
  const inserted = await db.from('compliance_regulation_versions')
    .upsert(row, { onConflict: 'regulation_id,content_hash', ignoreDuplicates: true })
    .select('id').maybeSingle();
  if (inserted.error) throw new Error(`version_create_failed:${inserted.error.message}`);
  if (inserted.data?.id) return { id: inserted.data.id, created: true };
  const existing = await db.from('compliance_regulation_versions').select('id')
    .eq('regulation_id', row.regulation_id).eq('content_hash', row.content_hash).single();
  if (existing.error || !existing.data?.id) throw new Error('version_reuse_failed:Could not verify the existing snapshot.');
  return { id: existing.data.id, created: false };
}
