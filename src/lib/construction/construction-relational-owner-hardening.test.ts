import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../../supabase/migrations/20260922001000_construction_relational_owner_scope.sql', import.meta.url),
  'utf8',
);
const statements = source.split('\n').map((line) => line.trim()).filter((line) => !line.startsWith('--'));

describe('Construction owner and workspace relational hardening', () => {
  it('adds exactly 52 same-owner, same-workspace foreign keys without replacing existing deletion actions', () => {
    const fks = statements.filter((line) => /^alter table public\.construction_/.test(line));
    expect(fks).toHaveLength(52);
    expect(new Set(fks.map((line) => line.match(/constraint (c_construction_scope_fk_\d+)/)?.[1])).size).toBe(52);
    for (const statement of fks) {
      expect(statement).toMatch(/foreign key \((?:[a-z_]+, workspace_id, user_id|workspace_id, user_id)\)/);
      expect(statement).toMatch(/references public\.construction_[a-z_]+ \((?:id, workspace_id, user_id|id, user_id)\)/);
      expect(statement).toContain('deferrable initially deferred');
      expect(statement).not.toMatch(/\b(?:drop|cascade)\b/i);
    }
  });

  it('provides 8 scoped unique parent indexes and all 51 missing child indexes', () => {
    const unique = statements.filter((line) => line.startsWith('create unique index if not exists c_construction_parent_scope_uq_'));
    const owner = statements.filter((line) => line.startsWith('create index if not exists c_construction_owner_idx_'));
    const references = statements.filter((line) => line.startsWith('create index if not exists c_construction_scope_idx_'));
    expect(unique).toHaveLength(8);
    expect(owner).toHaveLength(24);
    expect(references).toHaveLength(27);
    expect(new Set(owner.map((line) => line.match(/on public\.(construction_[a-z_]+)/)?.[1])).size).toBe(24);
    expect(owner.every((line) => line.endsWith('(user_id);'))).toBe(true);
    expect(unique.every((line) => /on public\.construction_[a-z_]+ \(id, (?:workspace_id, )?user_id\);/.test(line))).toBe(true);
    expect(references.every((line) => /\([a-z_]+, workspace_id, user_id\);/.test(line) || /\(workspace_id, user_id\);/.test(line))).toBe(true);
  });

  it('is additive and neither changes grants nor introduces new privileged routines', () => {
    expect(source).not.toMatch(/\b(?:drop table|truncate table|delete from|update public\.|insert into|security definer|grant |revoke )\b/i);
    expect(source).toMatch(/existing ON DELETE/i);
  });
});
