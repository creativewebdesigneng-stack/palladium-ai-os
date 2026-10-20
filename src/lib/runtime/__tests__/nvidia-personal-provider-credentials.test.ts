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
import { ProviderError, resolveModel as resolveBaseModel, runChat, type StreamEvent } from '../model-gateway.base';
import { resolveModel as resolveServerModel, runChat as runServerChat,
  streamChat as streamServerChat } from '../model-gateway.server';

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

  it('keeps the hosted NVIDIA model when a personal key overrides a Dell operator model', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'operator-dell-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/dell-local-model');
    const own = { provider: 'nvidia' as const, apiKey: 'owner-private-key' };
    expect(resolveBaseModel('nvidia', 'openai/gpt-oss-20b')).toBe('nvidia/dell-local-model');
    expect(resolveBaseModel('nvidia', 'openai/gpt-oss-20b', own)).toBe('openai/gpt-oss-20b');
    expect(resolveServerModel('nvidia', 'openai/gpt-oss-20b', own)).toBe('openai/gpt-oss-20b');
    expect(() => resolveServerModel('nvidia', 'nvidia/dell-local-model', own))
      .toThrow(ProviderError);
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Hosted NVIDIA' } }] }), { status: 200 }),
    );
    const result = await runServerChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hello' }],
      providerAccess: own, maxAttempts: 1,
      allowedProviders: ['nvidia'],
    });
    expect(result).toMatchObject({ provider: 'nvidia', model: 'openai/gpt-oss-20b', text: 'Hosted NVIDIA' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    const sent = JSON.parse(String(init?.body));
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(sent.model).toBe('openai/gpt-oss-20b');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer owner-private-key');
    expect(JSON.stringify(result)).not.toContain('owner-private-key');
  });

  it('rejects sending explicit Dell-only model through a personal key before provider network use', async () => {
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/private-model');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(runServerChat({
      provider: 'nvidia', model: 'nvidia/private-model',
      messages: [{ role: 'user', content: 'hello' }],
      providerAccess: { provider: 'nvidia', apiKey: 'user-private-key' },
      allowedProviders: ['nvidia'],
      maxAttempts: 1,
    })).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
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

  it('streams real SSE transport with the personal NVIDIA model, not the Dell operator model', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'operator-nim-test-only');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/dell-local-model');

    // Fake only the remote NVIDIA HTTP response. Exercise actual server gateway
    // model resolution and the existing low-level event-stream parser together.
    const sse = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hosted ' } }] }),
      '',
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'NVIDIA' } }] }),
      '',
      'data: ' + JSON.stringify({ choices: [], usage: { prompt_tokens: 6, completion_tokens: 2 } }),
      '',
      'data: [DONE]', '', '',
    ].join('\n');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );
    const events: StreamEvent[] = [];
    for await (const event of streamServerChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Hello' }],
      providerAccess: { provider: 'nvidia', apiKey: 'personal-only-nvidia-test-key' },
      allowedProviders: ['nvidia'], maxAttempts: 1,
    })) events.push(event);

    expect(events.filter(e => e.type === 'text').map(e => e.delta)).toEqual(['Hosted ', 'NVIDIA']);
    const done = events.find(e => e.type === 'done');
    expect(done?.result).toMatchObject({
      provider: 'nvidia', model: 'openai/gpt-oss-20b', text: 'Hosted NVIDIA',
      usage: { input: 6, output: 2 }, toolCalls: [],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer personal-only-nvidia-test-key');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'openai/gpt-oss-20b', stream: true,
      stream_options: { include_usage: true },
    });
    expect(JSON.stringify(events)).not.toContain('personal-only-nvidia-test-key');
    expect(JSON.stringify(events)).not.toContain('nim.dell.example');
  });

  it('streams operator NIM with the configured Dell model, not the NVIDIA hosted preset', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'operator-only-dell-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/dell-local-model');
    const sse = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Dell' } }] }),
      '', 'data: [DONE]', '', '',
    ].join(String.fromCharCode(10));
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );
    const events: StreamEvent[] = [];
    for await (const event of streamServerChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Hello' }],
      maxAttempts: 1, allowedProviders: ['nvidia'],
    })) events.push(event);
    expect(events.find(e => e.type === 'done')?.result).toMatchObject({
      provider: 'nvidia', model: 'nvidia/dell-local-model', text: 'Dell',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://nim.dell.example/v1/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer operator-only-dell-key');
    expect(JSON.parse(String(init?.body)).model).toBe('nvidia/dell-local-model');
  });

  it('refuses a Dell-only streaming model with a personal key before any network call', async () => {
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.dell.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/dell-local-model');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const events: StreamEvent[] = [];
    await expect((async () => {
      for await (const event of streamServerChat({
        provider: 'nvidia', model: 'nvidia/dell-local-model',
        messages: [{ role: 'user', content: 'Hello' }],
        providerAccess: { provider: 'nvidia', apiKey: 'private-personal-key' },
        allowedProviders: ['nvidia'], maxAttempts: 1,
      })) events.push(event);
    })()).rejects.toMatchObject({ status: 400, retryable: false });
    expect(events).toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('scopes personal credential usage metadata to user and nvidia only', async () => {
    await markUserModelProviderUsed({ userId: 'owner', provider: 'nvidia' });
    expect(mock.queries[0]).toMatchObject({
      table: 'model_provider_credentials', filters: { user_id: 'owner', provider: 'nvidia' },
    });
  });
});
