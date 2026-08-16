import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Builder Vercel preview deployment contract', () => {
  it('keeps Vercel credentials server-only and uploads SHA-addressed files', () => {
    const source = readSrc('lib/builder/builder-deploy-vercel.server.ts');
    expect(source).toContain('VERCEL_TOKEN');
    expect(source).toContain('VERCEL_TEAM_ID');
    expect(source).toContain('createHash("sha1")');
    expect(source).toContain('"x-vercel-digest": sha');
    expect(source).toContain('"/v2/files"');
    expect(source).toContain('Authorization: `Bearer ${token}`');
    expect(source).not.toContain('VITE_VERCEL');
    expect(source).not.toContain('E2B_API_KEY');
  });

  it('creates only Vercel preview deployments and never production deployments', () => {
    const source = readSrc('lib/builder/builder-deploy-vercel.server.ts');
    expect(source).toContain('"/v13/deployments"');
    expect(source).toContain('target: "preview"');
    expect(source).not.toContain('target: "production"');
    expect(source).toContain('MAX_TOTAL_BYTES');
    expect(source).toContain('unsafe deployment path');
  });

  it('requires owner scope plus applied source plus passed sandbox before deployment', () => {
    const source = readSrc('lib/builder/builder-deploy.functions.ts');
    expect(source).toContain('requireSupabaseAuth');
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.eq("source_status", "generated")');
    expect(source).toContain('.eq("repository_status", "files_applied")');
    expect(source).toContain('.eq("sandbox_status", "passed")');
    expect(source).toContain('createBuilderPreviewDeployment');
    expect(source).toContain('refreshBuilderDeployment');
    expect(source).toContain('A preview deployment is already active');
  });

  it('persists owner-scoped preview deployment history with one active preview per job', () => {
    const migration = readRepo('supabase/migrations/20260816030000_builder_deployments.sql');
    expect(migration).toContain('create table if not exists public.builder_deployments');
    expect(migration).toContain("target text not null default 'preview' check (target in ('preview'))");
    expect(migration).toContain("status in ('queued', 'uploading', 'building', 'ready', 'failed', 'cancelled')");
    expect(migration).toContain('builder_deployments_active_preview_idx');
    expect(migration).toContain('alter table public.builder_deployments enable row level security');
    expect(migration).toContain('using (auth.uid() = user_id)');
    expect(migration).toContain('with check (auth.uid() = user_id)');
  });
});
