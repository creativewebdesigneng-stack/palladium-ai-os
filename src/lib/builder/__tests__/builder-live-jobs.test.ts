import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Builder durable job contract', () => {
  it('persists owner-scoped build requests through authenticated server functions', () => {
    const source = readSrc('lib/builder/builder.functions.ts');
    expect(source).toContain('requireSupabaseAuth');
    expect(source).toContain('.from("builder_jobs")');
    expect(source).toContain('user_id: context.userId');
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('status: "requested"');
  });

  it('keeps unfinished Builder stages explicitly disabled rather than simulated', () => {
    const source = readSrc('screens/Builder.jsx');
    expect(source).toContain('createBuilderJob');
    expect(source).toContain('listBuilderJobs');
    expect(source).toContain('Save build request');
    expect(source).toContain('Repository creation and code writes remain disabled');
    expect(source).toContain('Sandboxed build/test execution remains disabled');
    expect(source).not.toContain('sample source files');
    expect(source).not.toContain('BUILD_STAGES');
    expect(source).not.toContain('SAMPLE_FILES');
  });

  it('enforces owner-only RLS for builder jobs', () => {
    const migration = readRepo('supabase/migrations/20260816011500_builder_jobs.sql');
    expect(migration).toContain('alter table public.builder_jobs enable row level security');
    expect(migration).toContain('using (auth.uid() = user_id)');
    expect(migration).toContain('with check (auth.uid() = user_id)');
  });
});
