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

  it('runs live planning through the shared model gateway and persists only while planning', () => {
    const functions = readSrc('lib/builder/builder.functions.ts');
    const planner = readSrc('lib/builder/builder-plan.server.ts');
    expect(functions).toContain('generateBuilderJobPlan');
    expect(functions).toContain('resolveAssistantModelPreference');
    expect(functions).toContain('status: "planning"');
    expect(functions).toContain('.eq("status", "planning")');
    expect(functions).toContain('status: "planned"');
    expect(planner).toContain('runChat');
    expect(planner).toContain('parseBuilderPlan');
  });

  it('generates bounded source manifests without performing repository writes', () => {
    const functions = readSrc('lib/builder/builder.functions.ts');
    const generator = readSrc('lib/builder/builder-source.server.ts');
    const screen = readSrc('screens/Builder.jsx');
    expect(functions).toContain('generateBuilderJobSource');
    expect(functions).toContain('source_status: "generating"');
    expect(functions).toContain('source_status: "generated"');
    expect(generator).toContain('generateBuilderSourceManifest');
    expect(generator).toContain('parseBuilderSourceManifest');
    expect(generator).toContain('runChat');
    expect(screen).toContain('Generate source');
    expect(screen).toContain('GitHub writes require the existing high-risk approval pipeline');
    expect(screen).not.toContain('BUILD_STAGES');
    expect(screen).not.toContain('SAMPLE_FILES');
  });

  it('enforces owner-only RLS and persists source lifecycle state', () => {
    const migration = readRepo('supabase/migrations/20260816011500_builder_jobs.sql');
    expect(migration).toContain('alter table public.builder_jobs enable row level security');
    expect(migration).toContain('using (auth.uid() = user_id)');
    expect(migration).toContain('with check (auth.uid() = user_id)');
    expect(migration).toContain("'planning'");
    expect(migration).toContain("'planned'");
    expect(migration).toContain("source_status text not null default 'not_started'");
    expect(migration).toContain("'generating'");
    expect(migration).toContain("'generated'");
  });
});
