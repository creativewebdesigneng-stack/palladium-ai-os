import { describe, expect, it, vi } from 'vitest';
import { persistRegulationVersion } from '../../../supabase/functions/compliance-regulatory-sync/version-store';

function fixture(insert: unknown, existing: unknown = { data: { id: 'existing' }, error: null }) {
  const q = { upsert: vi.fn(() => q), select: vi.fn(() => q), eq: vi.fn(() => q),
    maybeSingle: vi.fn(async () => insert), single: vi.fn(async () => existing) };
  return { q, db: { from: vi.fn(() => q) } };
}
const row = { regulation_id: 'regulation', content_hash: 'hash', content_text: 'immutable' };
describe('compliance immutable version persistence', () => {
  it('creates a new snapshot and records the actual creation', async () => {
    const { db, q } = fixture({ data: { id: 'new' }, error: null });
    await expect(persistRegulationVersion(db, row)).resolves.toEqual({ id: 'new', created: true });
    expect(q.upsert).toHaveBeenCalledWith(row, { onConflict: 'regulation_id,content_hash', ignoreDuplicates: true });
    expect(q.single).not.toHaveBeenCalled();
  });
  it('reuses an existing or concurrently inserted snapshot without overwriting it', async () => {
    const { db, q } = fixture({ data: null, error: null });
    await expect(persistRegulationVersion(db, row)).resolves.toEqual({ id: 'existing', created: false });
    expect(q.eq.mock.calls).toEqual([['regulation_id', 'regulation'], ['content_hash', 'hash']]);
    expect(q.upsert).toHaveBeenCalledTimes(1);
  });
  it('does not mask permission or storage failures as successful duplicate reuse', async () => {
    const { db, q } = fixture({ data: null, error: { message: 'permission denied' } });
    await expect(persistRegulationVersion(db, row)).rejects.toThrow('version_create_failed:permission denied');
    expect(q.single).not.toHaveBeenCalled();
  });
  it.each([{ data: null, error: null }, { data: null, error: { message: 'unavailable' } }])(
    'fails if the existing snapshot cannot be verified %j', async existing => {
      const { db } = fixture({ data: null, error: null }, existing);
      await expect(persistRegulationVersion(db, row)).rejects.toThrow('version_reuse_failed');
    },
  );
});
