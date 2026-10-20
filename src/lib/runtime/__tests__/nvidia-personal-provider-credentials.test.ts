import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  encrypted: vi.fn((x: string) => 'encrypted:' + x),
  decrypted: vi.fn((x: string) => x.replace(/^encrypted:/, '')),
  rows: new Map<string, { api_key_ciphertext: string; enabled: boolean }>(),
  queries: [] as Array<{ table: string; filters: Record<string, unknown> }>,
}));
vi.mock('@/lib/integrations/oauth.server', () => ({
  encryptToken: mock.encrypted, decryptToken: mock.decrypted,
}));
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      mock.queries.push({ table, filters });
      const chain: any = {
        select: () => chain,
        eq: (field: string, value: unknown) => { filters[field] = value; return chain; },
        maybeSingle: async () => ({
          data: mock.rows.get(String(filters['user_id'])) ?? null,
          error: null,
        }),
        update: () => chain,
      };
      return chain;
    },
  },
}));

import {
  resolveUserModelProviderAccess, isProviderAvailableForUser,
  markUserModelProviderUsed,
} from '../model-provider-credentials.server';
import { runChat } from '../model-gateway.base';

beforeEach(() => {
  vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', 'true');
  mock.rows.clear();
  mock.queries.length = 0;
  mock.decrypted.mockClear();
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'server-only-synthetic-secret');
  vi.stubEnv('NVIDIA_API_KEY', '');
  vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('NVIDIA personal model key: existing user-owned credential flow', () => {
  it('refuses to decrypt disabled personal NVIDIA connections', async () => {
    vi.stubEnv('NVIDIA_PERSONAL_CREDENTIALS_ENABLED', '');
    mock.rows.set('owner', { api_key_ciphertext: 'encrypted:owner-secret', enabled: true });
    expect(await resolveUserModelProviderAccess({ userId: 'owner', provider: 'nvidia' })).toBeNull();
    expect(mock.decrypted).not.toHaveBeenCalled();
  });

  it('only decrypts credentials from the authenticated user row, not another owner', async () => {
    mock.rows.set('owner', { api_key_ciphertext: 'encrypted:my-private-nvidia', enabled: true });
    mock.rows.set('other', { api_key_ciphertext: 'encrypted:foreign-private-nvidia', enabled: true });
    expect(await resolveUserModelProviderAccess({ userId: 'owner', provider: 'nvidia' }))
      .toEqual({ provider: 'nvidia', apiKey: 'my-private-nvidia' });
    expect(mock.queries[0]).toMatchObject({
      table: 'model_provider_credentials',
      filters: { user_id: 'owner', provider: 'nvidia', enabled: true },
    });
    expect(mock.decrypted).toHaveBeenCalledExactlyOnceWith('encrypted:my-private-nvidia');
    expect(await isProviderAvailableForUser({ userId: 'no-key', provider: 'nvidia' })).toBe(false);
    expect(await isProviderAvailableForUser({ userId: 'owner', provider: 'nvidia' })).toBe(true);
  });

  it('passes the personal NVIDIA key only to NVIDIA hosted endpoint, never Dell custom proxy', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'workspace-server-nvidia-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'Personal NVIDIA works' } }] }),
      { status: 200 },
    ));
    const res = await runChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Hello' }],
      providerAccess: { provider: 'nvidia', apiKey: 'user-personal-only-nvidia' },
      maxAttempts: 1,
    });
    expect(res.provider).toBe('nvidia');
    expect(res.text).toBe('Personal NVIDIA works');
    const [url, config] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(new Headers(config?.headers).get('Authorization')).toBe('Bearer user-personal-only-nvidia');
    expect(config?.redirect).toBe('error');
    expect(JSON.stringify(res)).not.toContain('user-personal-only-nvidia');
    expect(JSON.stringify(res)).not.toContain('nim.dell.example');
  });

  it('preserves operator-owned server routing when no personal key is selected', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'server-deployment-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'Dell server result' } }] }),
      { status: 200 },
    ));
    const res = await runChat({
      provider: 'nvidia', model: 'nvidia/custom-model',
      messages: [{ role: 'user', content: 'Hello' }],
      maxAttempts: 1,
    });
    expect(res.text).toBe('Dell server result');
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://nim.dell.example/v1/chat/completions');
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer server-deployment-key');
  });

  it('scopes personal credential usage metadata to user and nvidia only', async () => {
    await markUserModelProviderUsed({ userId: 'owner', provider: 'nvidia' });
    expect(mock.queries[0]).toMatchObject({
      table: 'model_provider_credentials', filters: { user_id: 'owner', provider: 'nvidia' },
    });
  });
});
