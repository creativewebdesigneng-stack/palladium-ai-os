import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../../supabase/migrations/20260922002000_construction_composite_fk_indexes.sql', import.meta.url),
  'utf8',
);
const indexes = source.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('create index '));

describe('Construction follow-up composite FK indexes', () => {
  it('covers the exact 25 foreign-key names identified by the production advisor', () => {
    const expected = [2,4,5,6,7,8,10,12,14,16,18,21,24,27,29,32,33,36,37,39,41,44,46,49,52];
    const ids = indexes.map((line) => Number(line.match(/c_construction_composite_idx_(\d{3})/)?.[1]));
    expect(indexes).toHaveLength(25);
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(25);
  });
  it('indexes the exact foreign-key columns without mutating schema ownership or data', () => {
    expect(indexes.every((line) => /^create index if not exists c_construction_composite_idx_\d{3} on public\.construction_[a-z_]+ \([a-z_, ]+\);$/.test(line))).toBe(true);
    expect(indexes.filter((line) => line.includes('(asset_id, workspace_id, user_id)'))).toHaveLength(2);
    expect(indexes.filter((line) => line.includes('(workspace_id, user_id)'))).toHaveLength(23);
    expect(source).not.toMatch(/\b(?:drop|alter table|delete|truncate|insert|update|grant|revoke|security definer)\b/i);
  });
});
