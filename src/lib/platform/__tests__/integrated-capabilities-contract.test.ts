import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtime = readFileSync(fileURLToPath(new URL('../integrated-capabilities.functions.ts', import.meta.url)), 'utf8');
const migration = readFileSync(fileURLToPath(new URL('../../../../supabase/migrations/20260829003000_integrated_platform_studios.sql', import.meta.url)), 'utf8');
const remotePanel = readFileSync(fileURLToPath(new URL('../../../components/developer/RemoteDeveloperSessionsPanel.jsx', import.meta.url)), 'utf8');
const commerce = readFileSync(fileURLToPath(new URL('../../../screens/CommerceStudio.jsx', import.meta.url)), 'utf8');

describe('integrated platform capability contracts', () => {
  it('uses owner-scoped native records with no raw provider-secret columns', () => {
    for (const table of ['sync_connections', 'commerce_workspaces', 'remote_developer_sessions', 'media_timeline_tracks', 'media_timeline_keyframes']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('auth.uid() = user_id');
    expect(runtime).toContain("api[_-]?key|secret|token|password");
    expect(runtime).toContain('Store credentials in PalladiumAI Integrations, not capability records.');
    expect(migration).not.toContain('api_key text');
    expect(migration).not.toContain('password text');
  });

  it('keeps remote developer sessions behind PalladiumAI instead of adding Codex', () => {
    expect(runtime).toContain("provider: z.enum(['palladium','happy','openhands'])");
    expect(runtime).not.toContain("'codex'");
    expect(remotePanel).toContain('No Codex-specific runtime is introduced');
    expect(remotePanel).toContain("PalladiumAI's existing controlled surfaces");
  });

  it('reuses the provider-neutral integration capability layer for commerce', () => {
    expect(runtime).toContain('listIntegrationCapabilities(context.userId, data.provider)');
    expect(commerce).toContain('No live capabilities found');
    expect(commerce).toContain('Medusa Enterprise material is deliberately excluded');
    expect(commerce).toContain("navigate('/integrations')");
  });

  it('bounds media keyframes and validates track ownership', () => {
    expect(migration).toContain('time_ms integer not null check (time_ms >= 0 and time_ms <= 86400000)');
    expect(runtime).toContain(".eq('user_id', context.userId).maybeSingle()");
    expect(runtime).toContain("z.enum(['step','linear','smooth'])");
  });
});
