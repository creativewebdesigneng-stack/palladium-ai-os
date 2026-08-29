import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtime = readFileSync(fileURLToPath(new URL('../web-snapshots.functions.ts', import.meta.url)), 'utf8');
const migration = readFileSync(fileURLToPath(new URL('../../../../supabase/migrations/20260829003000_integrated_platform_studios.sql', import.meta.url)), 'utf8');

describe('Web Intelligence snapshot contract', () => {
  it('keeps snapshots owner scoped and reuses the public-target policy', () => {
    expect(migration).toContain('alter table public.web_intelligence_snapshots enable row level security');
    expect(runtime).toContain(".eq('user_id', context.userId)");
    expect(runtime).toContain('assertPublicHttpUrl');
    expect(runtime).toContain("if (job.data.status !== 'completed')");
    expect(runtime).toContain("job.data.operation === 'search'");
  });

  it('stores bounded excerpts and deterministic hashes for change detection', () => {
    expect(runtime).toContain("createHash('sha256')");
    expect(runtime).toContain('serialized.slice(0, 1200)');
    expect(runtime).toContain('previous.data.content_hash !== contentHash');
    expect(runtime).toContain("action: 'web_intelligence.snapshot_created'");
  });
});
