import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('production release hardening', () => {
  it('removes the legacy simulated browser-session provider default without rewriting history', () => {
    const migration = readRepo('supabase/migrations/20260816041000_browser_sessions_require_provider.sql');
    expect(migration).toContain('alter column provider drop default');
    expect(migration.toLowerCase()).not.toContain('update public.browser_sessions');
  });

  it('keeps high severity dependency audit in the release gate', () => {
    const workflow = readRepo('.github/workflows/backend-check.yml');
    expect(workflow).toContain('bun audit --audit-level high');
    expect(workflow).toContain('bun install --frozen-lockfile');
  });
});
