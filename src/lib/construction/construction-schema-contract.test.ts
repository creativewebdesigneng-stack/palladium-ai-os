import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The seven existing construction migrations are an ordered, additive schema
 * contract. Tests don't claim a production database is activated: the separate
 * deployment ledger records actual Supabase migration and RLS evidence.
 */
const migrationFiles = [
  '20260915002500_construction_industrial_operations.sql',
  '20260915004000_construction_field_commercial_control.sql',
  '20260915005000_construction_planning_estimating_workforce.sql',
  '20260915006000_construction_digital_asset_intelligence.sql',
  '20260915007000_construction_inspection_reliability_reports.sql',
  '20260915008000_construction_agent_governance.sql',
] as const;

const migrations = migrationFiles.map((file) => ({
  file,
  sql: readFileSync(new URL('../../../supabase/migrations/' + file, import.meta.url), 'utf8'),
}));

describe('Construction & Industrial schema contract', () => {
  it('contains 24 uniquely defined owner-scoped tables across six ordered migrations', () => {
    const tables = migrations.flatMap(({ sql }) =>
      [...sql.matchAll(/create table public\.(construction_[a-z_]+)\s*\(/gi)].map((match) => match[1]!)
    );
    expect(tables).toHaveLength(24);
    expect(new Set(tables).size).toBe(24);
    expect(tables).toContain('construction_workspaces');
    expect(tables).toContain('construction_agent_actions');
    expect(tables).toContain('construction_asset_health');
    expect(tables).toContain('construction_reports');
  });

  it('includes each created table in its own RLS and Data API privilege loop', () => {
    for (const { file, sql } of migrations) {
      const statements = [...sql.matchAll(/create table public\.(construction_[a-z_]+)\s*\(/gi)].map((match) => match[1]!);
      expect(statements.length, file).toBeGreaterThan(0);
      const policies = sql.slice(sql.lastIndexOf('do $$'));
      for (const table of statements) expect(policies, table + ' missing RLS loop in ' + file).toContain(table);
      expect(policies).toContain('enable row level security');
      expect(policies).toContain('revoke all on table public.%I from anon');
      expect(policies).toContain('auth.uid()');
      expect(policies).toContain('grant select,insert,update,delete on table public.%I to authenticated');
      expect(sql).not.toMatch(/\b(?:drop\s+table|truncate\s+table)\b/i);
    }
  });

  it('retains the explicit construction approval index migration', () => {
    const sql = readFileSync(new URL('../../../supabase/migrations/20260915009000_construction_approval_index.sql', import.meta.url), 'utf8');
    expect(sql).toContain('construction_agent_actions_approval_idx');
    expect(sql).toContain('approval_request_id');
    expect(sql).toContain('if not exists');
  });
});
