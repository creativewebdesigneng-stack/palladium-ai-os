import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Builder production publish contract', () => {
  it('uses the current Vercel promote endpoint without creating a production deployment', () => {
    const source = readSrc('lib/builder/builder-deploy-vercel.server.ts');
    expect(source).toContain('/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}');
    expect(source).toContain('method: "POST"');
    expect(source).not.toContain('target: "production"');
    expect(source).toContain('safeVercelId');
  });

  it('requires a high-risk approval tied to the exact project and deployment ids', () => {
    const source = readSrc('lib/builder/builder-deploy.functions.ts');
    expect(source).toContain('action_type: "vercel_production_promote"');
    expect(source).toContain('risk_level: "high"');
    expect(source).toContain('.eq("status", "approved")');
    expect(source).toContain('approval.details?.deployment_id');
    expect(source).toContain('approval.details?.project_id');
    expect(source).toContain('.eq("production_status", "approved")');
    expect(source).toContain('production_status: "promoting"');
    expect(source).toContain('production_status: "promoted"');
  });

  it('requires a ready owner-scoped preview before production approval can be queued', () => {
    const source = readSrc('lib/builder/builder-deploy.functions.ts');
    expect(source).toContain('queueBuilderProductionApproval');
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.eq("target", "preview")');
    expect(source).toContain('.eq("status", "ready")');
    expect(source).toContain('Refresh the ready Vercel preview before requesting production approval.');
  });

  it('persists a bounded production lifecycle without weakening deployment RLS', () => {
    const migration = readRepo('supabase/migrations/20260816040000_builder_production_publish.sql');
    const original = readRepo('supabase/migrations/20260816030000_builder_deployments.sql');
    expect(migration).toContain("production_status in ('not_started', 'approval_pending', 'approved', 'promoting', 'promoted', 'failed')");
    expect(migration).toContain('production_approval_id uuid');
    expect(migration).toContain('production_promoted_at timestamptz');
    expect(original).toContain('alter table public.builder_deployments enable row level security');
    expect(original).toContain('using (auth.uid() = user_id)');
  });

  it('keeps production promotion explicit in the Builder UI', () => {
    const screen = readSrc('screens/Builder.jsx');
    expect(screen).toContain('Request production approval');
    expect(screen).toContain('Refresh approval');
    expect(screen).toContain('Promote approved preview');
    expect(screen).toContain('separate high-risk approval');
  });
});
