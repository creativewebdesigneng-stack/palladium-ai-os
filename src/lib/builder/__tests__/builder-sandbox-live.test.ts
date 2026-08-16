import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Builder isolated sandbox validation contract', () => {
  it('uses the real E2B SDK and tears down every sandbox', () => {
    const source = readSrc('lib/builder/builder-sandbox.server.ts');
    expect(source).toContain('from "e2b"');
    expect(source).toContain('Sandbox.create');
    expect(source).toContain('sandbox.files.write');
    expect(source).toContain('sandbox.commands.run');
    expect(source).toContain('await sandbox.kill()');
    expect(source).toContain('E2B_API_KEY');
    expect(source).not.toContain('child_process');
    expect(source).not.toContain('Bun.spawn');
  });

  it('runs install and only the validation scripts that actually exist', () => {
    const source = readSrc('lib/builder/builder-sandbox.server.ts');
    expect(source).toContain('npm ci --ignore-scripts');
    expect(source).toContain('npm install --ignore-scripts');
    expect(source).toContain('npm run build');
    expect(source).toContain('npm run typecheck');
    expect(source).toContain('npm test -- --run');
    expect(source).toContain('status: "skipped"');
    expect(source).toContain('LOG_LIMIT');
  });

  it('allows owner-authenticated execution only after GitHub source application', () => {
    const source = readSrc('lib/builder/builder-sandbox.functions.ts');
    expect(source).toContain('requireSupabaseAuth');
    expect(source).toContain('runBuilderSandboxJob');
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.eq("source_status", "generated")');
    expect(source).toContain('.eq("repository_status", "files_applied")');
    expect(source).toContain('.in("sandbox_status", ["not_started", "failed"])');
    expect(source).toContain('sandbox_status: "running"');
    expect(source).toContain('result.passed ? "passed" : "failed"');
  });

  it('persists bounded durable sandbox lifecycle fields in a new migration', () => {
    const migration = readRepo('supabase/migrations/20260816020000_builder_sandbox_validation.sql');
    expect(migration).toContain("sandbox_status text not null default 'not_started'");
    expect(migration).toContain('sandbox_provider text');
    expect(migration).toContain('sandbox_results jsonb');
    expect(migration).toContain("'provisioning'");
    expect(migration).toContain("'running'");
    expect(migration).toContain("'passed'");
    expect(migration).toContain("'failed'");
  });
});
