import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20260929230000_auth_rls_initplan_optimization.sql',
  'utf8',
);

describe('auth RLS init-plan optimization', () => {
  it('keeps the optimization on the exact advisor allowlist', () => {
    const targets = migration.match(/^    \('[^']+', '[^']+'\)[,]?$/gm) ?? [];

    expect(targets).toHaveLength(44);
    expect(migration).toContain("('voice_studio_jobs', 'voice_studio_jobs_select_own')");
    expect(migration).toContain("('workflow_runs', 'workflow_runs_owner_queue')");
    expect(migration).toContain("('autonomous_goal_runs', 'autonomous_goal_runs_owner_update')");
    expect(migration).toContain("('agent_skill_script_executions', 'agent_skill_script_executions_select_own')");
  });

  it('changes only auth.uid evaluation shape instead of rebuilding access policies', () => {
    expect(migration).toContain("replace(original_qual, 'auth.uid()', '(select auth.uid())')");
    expect(migration).toContain("replace(original_check, 'auth.uid()', '(select auth.uid())')");
    expect(migration.toLowerCase()).not.toContain('drop policy');
    expect(migration.toLowerCase()).not.toContain('create policy');
    expect(migration).toContain('alter policy %I on public.%I');
  });

  it('fails closed if live policy definitions drift before application', () => {
    expect(migration).toContain('rls_policy_not_found');
    expect(migration).toContain('rls_policy_no_direct_auth_uid');
    expect(migration).toContain('rls_policy_target_count_mismatch');
    expect(migration).toContain('processed <> 44');
  });
});
